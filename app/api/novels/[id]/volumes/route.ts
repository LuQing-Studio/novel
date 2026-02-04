import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireApiNovelOwner } from '@/lib/auth/api';

interface VolumeRow {
  id: string;
  novelId: string;
  number: number;
  title: string;
  outline: string;
  targetChapters: number | null;
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

    const volumes = await query<VolumeRow>(
      'SELECT * FROM volumes WHERE novel_id = $1 ORDER BY number',
      [id]
    );
    return NextResponse.json(volumes);
  } catch (error) {
    console.error('Failed to fetch volumes:', error);
    return NextResponse.json({ error: 'Failed to fetch volumes' }, { status: 500 });
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
    const inputNumber = safeInt(body.number);
    const title = safeString(body.title).trim();
    const outline = safeString(body.outline).trim();
    const targetChapters = safeInt(body.targetChapters ?? body.target_chapters);

    const maxRow = await queryOne<{ max: number }>(
      'SELECT COALESCE(MAX(number), 0)::int AS max FROM volumes WHERE novel_id = $1',
      [id]
    );
    const nextNumber = (maxRow?.max ?? 0) + 1;
    const volumeNumber = inputNumber && inputNumber > 0 ? inputNumber : nextNumber;

    const finalTitle = title || `卷${volumeNumber}`;

    const [volume] = await query<VolumeRow>(
      `INSERT INTO volumes (novel_id, number, title, outline, target_chapters)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, volumeNumber, finalTitle, outline, targetChapters]
    );

    return NextResponse.json(volume, { status: 201 });
  } catch (error) {
    console.error('Failed to create volume:', error);
    return NextResponse.json({ error: 'Failed to create volume' }, { status: 500 });
  }
}

