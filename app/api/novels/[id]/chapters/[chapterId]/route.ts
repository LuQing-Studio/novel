import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { Chapter } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { chapterId } = await params;
    const chapter = await queryOne<Chapter>(
      'SELECT * FROM chapters WHERE id = $1',
      [chapterId]
    );

    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(chapter);
  } catch (error) {
    console.error('Failed to fetch chapter:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chapter' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { chapterId } = await params;
    const body = await request.json();
    const { number, title, content, outline } = body;

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (number !== undefined) {
      updates.push(`number = $${paramIndex++}`);
      values.push(number);
    }

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }

    if (content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(content);
    }

    if (outline !== undefined) {
      updates.push(`outline = $${paramIndex++}`);
      values.push(outline);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(chapterId);

    const [chapter] = await query<Chapter>(
      `UPDATE chapters
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(chapter);
  } catch (error) {
    console.error('Failed to update chapter:', error);
    return NextResponse.json(
      { error: 'Failed to update chapter' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { chapterId } = await params;
    await query('DELETE FROM chapters WHERE id = $1', [chapterId]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete chapter:', error);
    return NextResponse.json(
      { error: 'Failed to delete chapter' },
      { status: 500 }
    );
  }
}
