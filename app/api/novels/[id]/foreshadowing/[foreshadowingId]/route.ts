import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireApiNovelOwner } from '@/lib/auth/api';
import { Foreshadowing } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; foreshadowingId: string }> }
) {
  try {
    const { id, foreshadowingId } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const item = await queryOne<Foreshadowing>(
      'SELECT * FROM foreshadowing WHERE id = $1 AND novel_id = $2',
      [foreshadowingId, id]
    );

    if (!item) {
      return NextResponse.json(
        { error: 'Foreshadowing not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Failed to fetch foreshadowing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch foreshadowing' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; foreshadowingId: string }> }
) {
  try {
    const { id, foreshadowingId } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const body = await request.json();
    const { content, planted_chapter, planned_reveal_chapter, revealed, revealed_chapter } = body;

    const [item] = await query<Foreshadowing>(
      `UPDATE foreshadowing
       SET content = $1, planted_chapter = $2, planned_reveal_chapter = $3,
           revealed = $4, revealed_chapter = $5, updated_at = NOW()
       WHERE id = $6 AND novel_id = $7
       RETURNING *`,
      [content, planted_chapter, planned_reveal_chapter, revealed, revealed_chapter, foreshadowingId, id]
    );

    if (!item) {
      return NextResponse.json(
        { error: 'Foreshadowing not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Failed to update foreshadowing:', error);
    return NextResponse.json(
      { error: 'Failed to update foreshadowing' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; foreshadowingId: string }> }
) {
  try {
    const { id, foreshadowingId } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const deleted = await queryOne<{ id: string }>(
      'DELETE FROM foreshadowing WHERE id = $1 AND novel_id = $2 RETURNING id',
      [foreshadowingId, id]
    );
    if (!deleted) {
      return NextResponse.json({ error: 'Foreshadowing not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete foreshadowing:', error);
    return NextResponse.json(
      { error: 'Failed to delete foreshadowing' },
      { status: 500 }
    );
  }
}
