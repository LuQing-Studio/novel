import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireApiNovelOwner } from '@/lib/auth/api';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const novel = await queryOne('SELECT * FROM novels WHERE id = $1', [id]);
    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    const volumes = await query(
      'SELECT * FROM volumes WHERE novel_id = $1 ORDER BY number',
      [id]
    );

    const chapterPlans = await query(
      'SELECT * FROM chapter_plans WHERE novel_id = $1 ORDER BY number',
      [id]
    );

    const chapters = await query(
      'SELECT id, novel_id, volume_id, plan_id, number, title, outline, word_count, created_at FROM chapters WHERE novel_id = $1 ORDER BY number',
      [id]
    );

    return NextResponse.json({ novel, volumes, chapterPlans, chapters });
  } catch (error) {
    console.error('Failed to load workbench:', error);
    return NextResponse.json({ error: 'Failed to load workbench' }, { status: 500 });
  }
}

