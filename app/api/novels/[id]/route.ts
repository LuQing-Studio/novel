import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireApiNovel, requireApiUser } from '@/lib/auth/api';
import { Novel } from '@/lib/types';

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireApiNovel(id);
    if ('response' in auth) return auth.response;
    return NextResponse.json(auth.novel);
  } catch (error) {
    console.error('Failed to fetch novel:', error);
    return NextResponse.json(
      { error: 'Failed to fetch novel' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireApiUser();
    if ('response' in auth) return auth.response;

    const { user } = auth;
    const body = (await request.json()) as Record<string, unknown>;
    const title = safeString(body.title).trim();
    const description = safeString(body.description).trim();
    const genre = safeString(body.genre).trim();
    const idea = safeString(body.idea).trim();
    const overallOutline = safeString(body.overall_outline ?? body.overallOutline).trim();

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (body.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (body.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (body.genre !== undefined) {
      updates.push(`genre = $${paramIndex++}`);
      values.push(genre);
    }
    if (body.idea !== undefined) {
      updates.push(`idea = $${paramIndex++}`);
      values.push(idea);
    }
    if (body.overall_outline !== undefined || body.overallOutline !== undefined) {
      updates.push(`overall_outline = $${paramIndex++}`);
      values.push(overallOutline);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const [novel] = await query<Novel>(
      `UPDATE novels
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      [...values, id, user.id]
    );

    if (!novel) {
      return NextResponse.json(
        { error: 'Novel not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(novel);
  } catch (error) {
    console.error('Failed to update novel:', error);
    return NextResponse.json(
      { error: 'Failed to update novel' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireApiUser();
    if ('response' in auth) return auth.response;

    const { user } = auth;
    const deleted = await queryOne<{ id: string }>(
      'DELETE FROM novels WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, user.id]
    );
    if (!deleted) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete novel:', error);
    return NextResponse.json(
      { error: 'Failed to delete novel' },
      { status: 500 }
    );
  }
}
