import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireApiNovelOwner } from '@/lib/auth/api';
import { countWords } from '@/lib/utils/text';

interface ChapterVersion {
  id: string;
  chapterId: string;
  versionNumber: number;
  content: string;
  wordCount: number;
  createdAt: string;
  createdBy: string;
  changeDescription: string | null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { id, chapterId } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const versions = await query<ChapterVersion>(
      `SELECT cv.*
       FROM chapter_versions cv
       JOIN chapters c ON c.id = cv.chapter_id
       WHERE cv.chapter_id = $1
         AND c.novel_id = $2
       ORDER BY cv.version_number DESC`,
      [chapterId, id]
    );

    return NextResponse.json(versions);
  } catch (error) {
    console.error('Failed to get chapter versions:', error);
    return NextResponse.json(
      { error: 'Failed to get chapter versions' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { id, chapterId } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const chapter = await queryOne<{ id: string }>(
      'SELECT id FROM chapters WHERE id = $1 AND novel_id = $2',
      [chapterId, id]
    );
    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const { content, changeDescription } = await request.json();

    // 获取当前最大版本号
    const maxVersionResult = await query<{ maxVersion: number }>(
      'SELECT COALESCE(MAX(version_number), 0) as max_version FROM chapter_versions WHERE chapter_id = $1',
      [chapterId]
    );
    const nextVersion = (maxVersionResult[0]?.maxVersion || 0) + 1;

    // 计算字数
    const wordCount = countWords(content);

    // 创建新版本
    const newVersion = await query<ChapterVersion>(
      `INSERT INTO chapter_versions (chapter_id, version_number, content, word_count, change_description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [chapterId, nextVersion, content, wordCount, changeDescription || null]
    );

    return NextResponse.json(newVersion[0]);
  } catch (error) {
    console.error('Failed to create chapter version:', error);
    return NextResponse.json(
      { error: 'Failed to create chapter version' },
      { status: 500 }
    );
  }
}
