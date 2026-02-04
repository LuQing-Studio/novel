import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireApiNovelOwner } from '@/lib/auth/api';

interface ChapterPlanRow {
  id: string;
  novelId: string;
  volumeId: string;
  number: number;
  title: string;
  outline: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const plans = await query<ChapterPlanRow>(
      'SELECT * FROM chapter_plans WHERE novel_id = $1 ORDER BY number',
      [id]
    );
    return NextResponse.json(plans);
  } catch (error) {
    console.error('Failed to fetch chapter plans:', error);
    return NextResponse.json({ error: 'Failed to fetch chapter plans' }, { status: 500 });
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

    const body = (await request.json()) as Record<string, unknown>;
    const volumeId = safeString(body.volumeId ?? body.volume_id).trim();
    const title = safeString(body.title).trim();
    const outline = safeString(body.outline).trim();
    const inputNumber = safeInt(body.number);

    if (!volumeId) {
      return NextResponse.json({ error: 'volumeId is required' }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const volume = await queryOne<{ id: string }>(
      'SELECT id FROM volumes WHERE id = $1 AND novel_id = $2',
      [volumeId, id]
    );
    if (!volume) {
      return NextResponse.json({ error: 'Volume not found' }, { status: 404 });
    }

    const maxRow = await queryOne<{ max: number }>(
      'SELECT COALESCE(MAX(number), 0)::int AS max FROM chapter_plans WHERE novel_id = $1',
      [id]
    );
    const nextNumber = (maxRow?.max ?? 0) + 1;
    const chapterNumber = inputNumber && inputNumber > 0 ? inputNumber : nextNumber;

    const [plan] = await query<ChapterPlanRow>(
      `INSERT INTO chapter_plans (novel_id, volume_id, number, title, outline, status)
       VALUES ($1, $2, $3, $4, $5, 'draft')
       RETURNING *`,
      [id, volumeId, chapterNumber, title, outline]
    );

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error('Failed to create chapter plan:', error);
    return NextResponse.json({ error: 'Failed to create chapter plan' }, { status: 500 });
  }
}

