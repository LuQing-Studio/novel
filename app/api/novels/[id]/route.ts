import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { Novel } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const novel = await queryOne<Novel>(
      'SELECT * FROM novels WHERE id = $1',
      [id]
    );

    if (!novel) {
      return NextResponse.json(
        { error: 'Novel not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(novel);
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
    const body = await request.json();
    const { title, description, genre, tags } = body;

    const [novel] = await query<Novel>(
      `UPDATE novels
       SET title = $1, description = $2, genre = $3, tags = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [title, description, genre, tags, id]
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
    await query('DELETE FROM novels WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete novel:', error);
    return NextResponse.json(
      { error: 'Failed to delete novel' },
      { status: 500 }
    );
  }
}
