import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireApiNovel } from '@/lib/auth/api';
import { getAIService } from '@/lib/ai/factory';
import { Novel, Chapter, Character, WorldSetting } from '@/lib/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { id, chapterId } = await params;

    const auth = await requireApiNovel(id);
    if ('response' in auth) return auth.response;

    const { novel } = auth;

    const chapter = await queryOne<Chapter>(
      'SELECT * FROM chapters WHERE id = $1 AND novel_id = $2',
      [chapterId, id]
    );
    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const characters = await query<Character>('SELECT * FROM characters WHERE novel_id = $1', [id]);
    const worldSettings = await query<WorldSetting>('SELECT * FROM world_settings WHERE novel_id = $1', [id]);

    const prompt = `你是一位专业的小说编辑。请审核以下章节内容,检查一致性问题并提供修改建议。

小说信息:
- 标题: ${novel.title}
- 类型: ${novel.genre}
- 简介: ${novel.description}

人物设定:
${characters.map(c => `- ${c.name}: ${c.description}`).join('\n')}

世界观设定:
${worldSettings.map(w => `- ${w.category}: ${w.content}`).join('\n')}

章节内容:
${chapter.content}

请从以下角度审核:
1. 人物行为是否符合设定
2. 世界观是否一致
3. 情节是否合理
4. 是否有明显的逻辑漏洞

请以 JSON 格式返回审核结果:
{
  "issues": [
    {
      "type": "人物一致性" | "世界观一致性" | "情节逻辑" | "其他",
      "severity": "严重" | "中等" | "轻微",
      "description": "问题描述",
      "suggestion": "修改建议"
    }
  ],
  "overall": "总体评价"
}`;

    const aiService = getAIService();

    const response = await aiService.generate({
      messages: [
        { role: 'system', content: '你是一位专业的小说编辑,擅长发现一致性问题。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    // 提取 JSON 内容,去掉可能的 markdown 代码块标记
    let jsonContent = response.content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const reviewResult = JSON.parse(jsonContent);
    return NextResponse.json(reviewResult);
  } catch (error) {
    console.error('Failed to review chapter:', error);
    return NextResponse.json(
      { error: 'Failed to review chapter' },
      { status: 500 }
    );
  }
}
