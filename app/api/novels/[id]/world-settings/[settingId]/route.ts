import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireApiNovelOwner } from '@/lib/auth/api';
import { WorldSetting } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; settingId: string }> }
) {
  try {
    const { id, settingId } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const setting = await queryOne<WorldSetting>(
      'SELECT * FROM world_settings WHERE id = $1 AND novel_id = $2',
      [settingId, id]
    );

    if (!setting) {
      return NextResponse.json(
        { error: 'World setting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(setting);
  } catch (error) {
    console.error('Failed to fetch world setting:', error);
    return NextResponse.json(
      { error: 'Failed to fetch world setting' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; settingId: string }> }
) {
  try {
    const { id, settingId } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const body = await request.json();
    const { category, content, related_chapters } = body;

    const [setting] = await query<WorldSetting>(
      `UPDATE world_settings
       SET category = $1, content = $2, related_chapters = $3, updated_at = NOW()
       WHERE id = $4 AND novel_id = $5
       RETURNING *`,
      [category, content, related_chapters, settingId, id]
    );

    if (!setting) {
      return NextResponse.json(
        { error: 'World setting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(setting);
  } catch (error) {
    console.error('Failed to update world setting:', error);
    return NextResponse.json(
      { error: 'Failed to update world setting' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; settingId: string }> }
) {
  try {
    const { id, settingId } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const deleted = await queryOne<{ id: string }>(
      'DELETE FROM world_settings WHERE id = $1 AND novel_id = $2 RETURNING id',
      [settingId, id]
    );
    if (!deleted) {
      return NextResponse.json({ error: 'World setting not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete world setting:', error);
    return NextResponse.json(
      { error: 'Failed to delete world setting' },
      { status: 500 }
    );
  }
}
