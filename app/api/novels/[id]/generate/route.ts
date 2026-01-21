import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getAIService } from '@/lib/ai/factory';
import { Novel, Chapter } from '@/lib/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { outline } = body;

    // 获取小说信息
    const novel = await queryOne<Novel>('SELECT * FROM novels WHERE id = $1', [id]);
    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    // 获取已有章节
    const chapters = await query<Chapter>(
      'SELECT * FROM chapters WHERE novel_id = $1 ORDER BY number',
      [id]
    );

    const nextChapterNumber = chapters.length + 1;

    // 构建 prompt
    const prompt = `你是一位专业的网文作家。请根据以下信息生成第 ${nextChapterNumber} 章的内容:

小说信息:
- 标题: ${novel.title}
- 类型: ${novel.genre}
- 简介: ${novel.description}

章节大纲: ${outline}

${chapters.length > 0 ? `前情提要:\n${chapters.slice(-2).map(c => `第${c.number}章: ${c.title}\n${c.outline}`).join('\n\n')}` : ''}

要求:
1. 生成约 3000 字的章节内容
2. 保持与前文的连贯性
3. 符合${novel.genre}类型的风格
4. 内容要有冲突和爽点

请直接输出章节内容,不要包含任何额外说明。`;

    // 调用 AI 生成
    const aiService = getAIService();

    const response = await aiService.generate({
      messages: [
        { role: 'system', content: '你是一位专业的网文作家,擅长创作引人入胜的故事。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      maxTokens: 4000,
    });

    // 保存章节
    const [chapter] = await query<Chapter>(
      `INSERT INTO chapters (novel_id, number, title, content, outline)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, nextChapterNumber, `第${nextChapterNumber}章`, response.content, outline]
    );

    // 更新小说统计
    await query(
      'UPDATE novels SET chapter_count = chapter_count + 1, updated_at = NOW() WHERE id = $1',
      [id]
    );

    return NextResponse.json(chapter);
  } catch (error) {
    console.error('Failed to generate chapter:', error);
    return NextResponse.json(
      { error: 'Failed to generate chapter' },
      { status: 500 }
    );
  }
}
