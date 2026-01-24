import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireApiNovelOwner } from '@/lib/auth/api';
import { Chapter } from '@/lib/types';
import { countWords } from '@/lib/utils/text';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { id, chapterId } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const chapter = await queryOne<Chapter>(
      'SELECT * FROM chapters WHERE id = $1 AND novel_id = $2',
      [chapterId, id]
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
    const { id, chapterId } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const body = await request.json();
    const { number, title, content, outline } = body;

    const existing = await queryOne<{ wordCount: number }>(
      'SELECT word_count FROM chapters WHERE id = $1 AND novel_id = $2',
      [chapterId, id]
    );
    if (!existing) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

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
      const nextContent = String(content);
      const nextWordCount = countWords(nextContent);
      updates.push(`content = $${paramIndex++}`);
      values.push(nextContent);

      updates.push(`word_count = $${paramIndex++}`);
      values.push(nextWordCount);
    }

    if (outline !== undefined) {
      updates.push(`outline = $${paramIndex++}`);
      values.push(outline);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(chapterId, id);

    const [chapter] = await query<Chapter>(
      `UPDATE chapters
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND novel_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      );
    }

    // 同步小说更新时间与字数统计（避免编辑后统计不一致）
    if (content !== undefined) {
      await query(
        `UPDATE novels
         SET word_count = COALESCE((SELECT SUM(word_count) FROM chapters WHERE novel_id = $1), 0),
             updated_at = NOW()
         WHERE id = $1`,
        [id]
      );
    } else {
      await query('UPDATE novels SET updated_at = NOW() WHERE id = $1', [id]);
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
    const { id, chapterId } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const deleted = await queryOne<{ id: string }>(
      'DELETE FROM chapters WHERE id = $1 AND novel_id = $2 RETURNING id',
      [chapterId, id]
    );
    if (!deleted) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete chapter:', error);
    return NextResponse.json(
      { error: 'Failed to delete chapter' },
      { status: 500 }
    );
  }
}
