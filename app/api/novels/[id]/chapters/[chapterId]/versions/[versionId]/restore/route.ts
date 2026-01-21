import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string; versionId: string }> }
) {
  try {
    const { chapterId, versionId } = await params;

    // 获取版本内容
    const version = await queryOne<{ content: string; word_count: number }>(
      'SELECT content, word_count FROM chapter_versions WHERE id = $1 AND chapter_id = $2',
      [versionId, chapterId]
    );

    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    // 更新章节内容
    await query(
      'UPDATE chapters SET content = $1, word_count = $2 WHERE id = $3',
      [version.content, version.word_count, chapterId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to restore version:', error);
    return NextResponse.json(
      { error: 'Failed to restore version' },
      { status: 500 }
    );
  }
}
