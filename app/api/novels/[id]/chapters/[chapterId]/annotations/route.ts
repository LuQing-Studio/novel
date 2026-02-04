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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { id, chapterId } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const chapter = await queryOne<{ id: string }>(
      'SELECT id FROM chapters WHERE id = $1 AND novel_id = $2',
      [chapterId, id]
    );
    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const annotations = await query(
      `SELECT *
       FROM chapter_annotations
       WHERE chapter_id = $1
       ORDER BY created_at DESC`,
      [chapterId]
    );
    return NextResponse.json(annotations);
  } catch (error) {
    console.error('Failed to fetch annotations:', error);
    return NextResponse.json({ error: 'Failed to fetch annotations' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { id, chapterId } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const chapter = await queryOne<{ id: string; content: string }>(
      'SELECT id, content FROM chapters WHERE id = $1 AND novel_id = $2',
      [chapterId, id]
    );
    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const quote = safeString(body.quote).trim();
    const comment = safeString(body.comment).trim();
    const startOffset = safeInt(body.startOffset ?? body.start_offset);
    const endOffset = safeInt(body.endOffset ?? body.end_offset);

    if (!quote) {
      return NextResponse.json({ error: 'quote is required' }, { status: 400 });
    }
    if (!comment) {
      return NextResponse.json({ error: 'comment is required' }, { status: 400 });
    }
    if (startOffset === null || endOffset === null || startOffset < 0 || endOffset <= startOffset) {
      return NextResponse.json({ error: 'Invalid offsets' }, { status: 400 });
    }
    if (endOffset > chapter.content.length) {
      return NextResponse.json({ error: 'Offsets out of range' }, { status: 400 });
    }

    const [annotation] = await query(
      `INSERT INTO chapter_annotations (chapter_id, status, quote, start_offset, end_offset, comment)
       VALUES ($1, 'open', $2, $3, $4, $5)
       RETURNING *`,
      [chapterId, quote, startOffset, endOffset, comment]
    );

    return NextResponse.json(annotation, { status: 201 });
  } catch (error) {
    console.error('Failed to create annotation:', error);
    return NextResponse.json({ error: 'Failed to create annotation' }, { status: 500 });
  }
}

