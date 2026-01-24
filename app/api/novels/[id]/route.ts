import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireApiNovel, requireApiUser } from '@/lib/auth/api';
import { Novel } from '@/lib/types';

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
    const body = await request.json();
    const { title, description, genre } = body;

    const [novel] = await query<Novel>(
      `UPDATE novels
       SET title = $1, description = $2, genre = $3, updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [title, description, genre, id, user.id]
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
