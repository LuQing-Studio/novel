import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireApiNovelOwner } from '@/lib/auth/api';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string; versionId: string }> }
) {
  try {
    const { id, chapterId, versionId } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const chapter = await queryOne<{ id: string }>(
      'SELECT id FROM chapters WHERE id = $1 AND novel_id = $2',
      [chapterId, id]
    );
    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    // 获取版本内容
    const version = await queryOne<{ content: string; wordCount: number }>(
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
      'UPDATE chapters SET content = $1, word_count = $2 WHERE id = $3 AND novel_id = $4',
      [version.content, version.wordCount, chapterId, id]
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
