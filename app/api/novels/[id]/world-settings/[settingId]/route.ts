import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { WorldSetting } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; settingId: string }> }
) {
  try {
    const { settingId } = await params;
    const setting = await queryOne<WorldSetting>(
      'SELECT * FROM world_settings WHERE id = $1',
      [settingId]
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
    const { settingId } = await params;
    const body = await request.json();
    const { category, content, related_chapters } = body;

    const [setting] = await query<WorldSetting>(
      `UPDATE world_settings
       SET category = $1, content = $2, related_chapters = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [category, content, related_chapters, settingId]
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
    const { settingId } = await params;
    await query('DELETE FROM world_settings WHERE id = $1', [settingId]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete world setting:', error);
    return NextResponse.json(
      { error: 'Failed to delete world setting' },
      { status: 500 }
    );
  }
}
