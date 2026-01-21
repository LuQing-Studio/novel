import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { countWords } from '@/lib/utils/text';

interface ChapterVersion {
  id: string;
  chapter_id: string;
  version_number: number;
  content: string;
  word_count: number;
  created_at: string;
  created_by: string;
  change_description: string | null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { chapterId } = await params;

    const versions = await query<ChapterVersion>(
      'SELECT * FROM chapter_versions WHERE chapter_id = $1 ORDER BY version_number DESC',
      [chapterId]
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
    const { chapterId } = await params;
    const { content, changeDescription } = await request.json();

    // 获取当前最大版本号
    const maxVersionResult = await query<{ max_version: number }>(
      'SELECT COALESCE(MAX(version_number), 0) as max_version FROM chapter_versions WHERE chapter_id = $1',
      [chapterId]
    );
    const nextVersion = (maxVersionResult[0]?.max_version || 0) + 1;

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
