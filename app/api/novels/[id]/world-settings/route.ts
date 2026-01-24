import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireApiNovelOwner } from '@/lib/auth/api';
import { WorldSetting } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const settings = await query<WorldSetting>(
      'SELECT * FROM world_settings WHERE novel_id = $1 ORDER BY category, created_at',
      [id]
    );
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to fetch world settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch world settings' },
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
    const { category, title, content, related_chapters } = body;

    const [setting] = await query<WorldSetting>(
      `INSERT INTO world_settings (novel_id, category, title, content, related_chapters)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, category, title, content, related_chapters]
    );

    return NextResponse.json(setting, { status: 201 });
  } catch (error) {
    console.error('Failed to create world setting:', error);
    return NextResponse.json(
      { error: 'Failed to create world setting' },
      { status: 500 }
    );
  }
}
