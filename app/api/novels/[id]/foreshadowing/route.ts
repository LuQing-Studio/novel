import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Foreshadowing } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const foreshadowing = await query<Foreshadowing>(
      'SELECT * FROM foreshadowing WHERE novel_id = $1 ORDER BY planted_chapter',
      [id]
    );
    return NextResponse.json(foreshadowing);
  } catch (error) {
    console.error('Failed to fetch foreshadowing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch foreshadowing' },
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
    const body = await request.json();
    const { content, planted_chapter, planned_reveal_chapter, revealed, revealed_chapter } = body;

    const [item] = await query<Foreshadowing>(
      `INSERT INTO foreshadowing (novel_id, content, planted_chapter, planned_reveal_chapter, revealed, revealed_chapter)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, content, planted_chapter, planned_reveal_chapter, revealed, revealed_chapter]
    );

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Failed to create foreshadowing:', error);
    return NextResponse.json(
      { error: 'Failed to create foreshadowing' },
      { status: 500 }
    );
  }
}
