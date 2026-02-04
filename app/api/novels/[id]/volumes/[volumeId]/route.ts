import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireApiNovelOwner } from '@/lib/auth/api';

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function safeInt(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.floor(n);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; volumeId: string }> }
) {
  try {
    const { id, volumeId } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM volumes WHERE id = $1 AND novel_id = $2',
      [volumeId, id]
    );
    if (!existing) {
      return NextResponse.json({ error: 'Volume not found' }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (body.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(safeString(body.title).trim());
    }

    if (body.outline !== undefined) {
      updates.push(`outline = $${paramIndex++}`);
      values.push(safeString(body.outline).trim());
    }

    if (body.targetChapters !== undefined || body.target_chapters !== undefined) {
      updates.push(`target_chapters = $${paramIndex++}`);
      values.push(safeInt(body.targetChapters ?? body.target_chapters));
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(volumeId, id);
    const [volume] = await query(
      `UPDATE volumes
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex} AND novel_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (!volume) {
      return NextResponse.json({ error: 'Volume not found' }, { status: 404 });
    }

    return NextResponse.json(volume);
  } catch (error) {
    console.error('Failed to update volume:', error);
    return NextResponse.json({ error: 'Failed to update volume' }, { status: 500 });
  }
}

