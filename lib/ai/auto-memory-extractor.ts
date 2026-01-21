import { query } from '@/lib/db';
import { extractCharactersFromChapter } from './character-extractor';
import { getLightRAGClient } from '@/lib/lightrag/client';

interface MemoryExtractionResult {
  characters: Array<{ name: string; description: string }>;
  worldSettings: Array<{ name: string; category: string; description: string }>;
  foreshadowing: Array<{ title: string; description: string }>;
}

export async function autoExtractMemories(
  novelId: string,
  chapterId: string,
  chapterContent: string,
  chapterNumber: number
): Promise<MemoryExtractionResult> {
  const result: MemoryExtractionResult = {
    characters: [],
    worldSettings: [],
    foreshadowing: []
  };

  try {
    // 1. 提取人物
    const characters = await extractCharactersFromChapter(chapterContent);
    result.characters = characters;

    // 自动添加到数据库
    for (const char of characters) {
      const existing = await query(
        'SELECT id FROM characters WHERE novel_id = $1 AND name = $2',
        [novelId, char.name]
      );

      if (existing.length === 0) {
        await query(
          `INSERT INTO characters (novel_id, name, description, first_appearance)
           VALUES ($1, $2, $3, $4)`,
          [novelId, char.name, char.description, chapterNumber]
        );
      }
    }

    // 2. 上传到LightRAG用于知识图谱构建
    const lightrag = getLightRAGClient();
    await lightrag.uploadDocument({
      content: chapterContent,
      description: `Chapter ${chapterNumber}`
    });

  } catch (error) {
    console.error('Auto memory extraction failed:', error);
  }

  return result;
}
