import { getAIService } from './factory';
import { query, queryOne } from '@/lib/db';
import { Character } from '@/lib/types';

interface ExtractedCharacter {
  name: string;
  description: string;
  personality?: string;
  abilities?: string[];
  role?: string;
}

const EXTRACTION_PROMPT = `分析以下章节内容,提取所有出现的人物角色。

对于每个角色,提供:
1. name: 角色姓名
2. description: 简短描述(1-2句话,包括身份、特征)
3. personality: 性格特点(如果明显)
4. abilities: 特殊能力或技能(如果提到)
5. role: 角色类型(主角/配角/次要人物)

只提取在本章节中有实际行动或对话的人物,忽略仅被提及的人物。

以JSON数组格式返回,例如:
[{"name":"张三","description":"年轻的修仙者,林辰的同学","personality":"勇敢坚毅","abilities":["剑术","火系法术"],"role":"配角"}]

章节内容:
{content}

请直接返回JSON数组,不要包含任何其他文字:`;

export async function extractCharactersFromChapter(
  novelId: string,
  chapterId: string,
  chapterNumber: number,
  content: string
): Promise<ExtractedCharacter[]> {
  const aiService = getAIService();

  const prompt = EXTRACTION_PROMPT.replace('{content}', content.substring(0, 3000));

  const response = await aiService.generate({
    messages: [
      { role: 'system', content: '你是一个专业的文学分析助手,擅长从小说中提取人物信息。' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    maxTokens: 1000,
  });

  try {
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    const jsonStr = jsonMatch ? jsonMatch[0] : response.content;
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Failed to parse character extraction result:', error);
    return [];
  }
}

export async function addExtractedCharacters(
  novelId: string,
  chapterNumber: number,
  characters: ExtractedCharacter[]
): Promise<void> {
  for (const char of characters) {
    const existing = await queryOne<Character>(
      'SELECT * FROM characters WHERE novel_id = $1 AND name = $2',
      [novelId, char.name]
    );

    if (!existing) {
      await query(
        `INSERT INTO characters (novel_id, name, description, personality, abilities, first_appearance, last_appearance)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          novelId,
          char.name,
          char.description,
          char.personality || null,
          char.abilities || [],
          chapterNumber,
          chapterNumber
        ]
      );
    } else {
      await query(
        'UPDATE characters SET last_appearance = $1 WHERE id = $2',
        [chapterNumber, existing.id]
      );
    }
  }
}
