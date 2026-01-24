import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireApiNovelOwner } from '@/lib/auth/api';
import { Chapter } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const chapters = await query<Chapter>(
      'SELECT * FROM chapters WHERE novel_id = $1 ORDER BY number',
      [id]
    );
    return NextResponse.json(chapters);
  } catch (error) {
    console.error('Failed to fetch chapters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chapters' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const body = await request.json();
    const { number, title, content, outline } = body;

    const [chapter] = await query<Chapter>(
      `INSERT INTO chapters (novel_id, number, title, content, outline)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, number, title, content, outline]
    );

    return NextResponse.json(chapter, { status: 201 });
  } catch (error) {
    console.error('Failed to create chapter:', error);
    return NextResponse.json(
      { error: 'Failed to create chapter' },
      { status: 500 }
    );
  }
}
