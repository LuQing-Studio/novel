import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { Chapter } from '@/lib/types';
import { requireApiNovel } from '@/lib/auth/api';
import { extractCharactersFromChapter, addExtractedCharacters } from '@/lib/ai/character-extractor';
import { getLightRAGClient } from '@/lib/lightrag/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { id, chapterId } = await params;

    const auth = await requireApiNovel(id);
    if ('response' in auth) return auth.response;

    // 获取章节
    const chapter = await queryOne<Chapter>(
      'SELECT * FROM chapters WHERE id = $1 AND novel_id = $2',
      [chapterId, id]
    );

    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const { novel } = auth;

    const results = {
      charactersExtracted: 0,
      lightragUploaded: false,
      errors: [] as string[]
    };

    // 1. 提取人物
    try {
      const characters = await extractCharactersFromChapter(id, chapterId, chapter.number, chapter.content);
      await addExtractedCharacters(id, chapter.number, characters);
      results.charactersExtracted = characters.length;
    } catch (error) {
      results.errors.push(`人物提取失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    // 2. 上传到LightRAG
    try {
      const lightRAGClient = getLightRAGClient();
      await lightRAGClient.uploadDocument({
        content: chapter.content,
        description: `${novel.title} - 第${chapter.number}章: ${chapter.title}`
      });
      results.lightragUploaded = true;
    } catch (error) {
      results.errors.push(`LightRAG上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Auto extract memories failed:', error);
    return NextResponse.json(
      { error: 'Failed to auto extract memories' },
      { status: 500 }
    );
  }
}
