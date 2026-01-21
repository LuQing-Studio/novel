import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getAIService } from '@/lib/ai/factory';
import { Novel, Chapter, Character, WorldSetting, Foreshadowing } from '@/lib/types';
import { lightRAGClient } from '@/lib/lightrag/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { id, chapterId } = await params;
    const body = await request.json();
    const { suggestions } = body;

    // 获取小说信息
    const novel = await queryOne<Novel>('SELECT * FROM novels WHERE id = $1', [id]);
    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    // 获取当前章节
    const chapter = await queryOne<Chapter>(
      'SELECT * FROM chapters WHERE id = $1 AND novel_id = $2',
      [chapterId, id]
    );
    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    // 获取所有章节
    const chapters = await query<Chapter>(
      'SELECT * FROM chapters WHERE novel_id = $1 ORDER BY number',
      [id]
    );

    // 检索相关记忆
    let ragContext = '';
    try {
      const ragResult = await lightRAGClient.query(chapter.outline || chapter.content.substring(0, 200), 'hybrid');
      if (ragResult) {
        ragContext = ragResult;
      }
    } catch (error) {
      console.warn('LightRAG query failed:', error);
    }

    const characters = await query<Character>(
      'SELECT * FROM characters WHERE novel_id = $1',
      [id]
    );

    const worldSettings = await query<WorldSetting>(
      'SELECT * FROM world_settings WHERE novel_id = $1',
      [id]
    );

    const foreshadowing = await query<Foreshadowing>(
      'SELECT * FROM foreshadowing WHERE novel_id = $1 AND revealed = false',
      [id]
    );

    // 构建增强 prompt
    let promptParts = [
      `你是一位专业的网文作家。请根据以下信息重新生成第 ${chapter.number} 章的内容:`,
      '',
      '小说信息:',
      `- 标题: ${novel.title}`,
      `- 类型: ${novel.genre}`,
      `- 简介: ${novel.description}`,
      '',
      `章节大纲: ${chapter.outline || '无'}`,
    ];

    // 添加前情提要
    const prevChapters = chapters.filter(c => c.number < chapter.number).slice(-2);
    if (prevChapters.length > 0) {
      promptParts.push('');
      promptParts.push('前情提要:');
      prevChapters.forEach(c => {
        promptParts.push(`第${c.number}章: ${c.title}`);
        promptParts.push(c.outline || c.content.substring(0, 200));
      });
    }

    // 添加人物设定
    if (characters.length > 0) {
      promptParts.push('');
      promptParts.push('人物设定:');
      characters.forEach(c => {
        promptParts.push(`- ${c.name}: ${c.description}${c.status ? ` (状态: ${c.status})` : ''}`);
      });
    }

    // 添加世界观设定
    if (worldSettings.length > 0) {
      promptParts.push('');
      promptParts.push('世界观设定:');
      worldSettings.forEach(s => {
        promptParts.push(`- [${s.category}] ${s.content}`);
      });
    }

    // 添加待揭示伏笔
    const relevantForeshadowing = foreshadowing.filter(
      f => f.planned_reveal_chapter && f.planned_reveal_chapter <= chapter.number
    );
    if (relevantForeshadowing.length > 0) {
      promptParts.push('');
      promptParts.push('待揭示伏笔:');
      relevantForeshadowing.forEach(f => {
        promptParts.push(`- ${f.content} (计划第${f.planned_reveal_chapter}章揭示)`);
      });
    }

    // 添加 RAG 上下文
    if (ragContext) {
      promptParts.push('');
      promptParts.push('相关上下文:');
      promptParts.push(ragContext.substring(0, 500));
    }

    // 添加审核建议
    if (suggestions && suggestions.length > 0) {
      promptParts.push('');
      promptParts.push('编辑审核建议(请务必修正这些问题):');
      suggestions.forEach((s: string) => {
        promptParts.push(`- ${s}`);
      });
    }

    // 添加要求
    promptParts.push('');
    promptParts.push('要求:');
    promptParts.push('1. 生成约 3000 字的章节内容');
    promptParts.push('2. 保持与前文的连贯性');
    promptParts.push('3. 严格遵守人物设定和世界观规则');
    promptParts.push('4. 如果本章应该揭示某个伏笔,请自然地融入情节');
    promptParts.push(`5. 符合${novel.genre}类型的风格`);
    promptParts.push('6. 内容要有冲突和爽点');
    promptParts.push('7. 根据编辑建议修正所有问题');
    promptParts.push('');
    promptParts.push('请直接输出章节内容,不要包含任何额外说明。');

    const prompt = promptParts.join('\n');

    // 调用 AI 生成
    const aiService = getAIService();

    const response = await aiService.generate({
      messages: [
        { role: 'system', content: '你是一位专业的网文作家,擅长创作引人入胜的故事。你会严格遵守人物设定和世界观规则,确保长期一致性。你会认真对待编辑的审核建议,修正所有问题。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      maxTokens: 4000,
    });

    // 更新章节
    const [updatedChapter] = await query<Chapter>(
      `UPDATE chapters
       SET content = $1, updated_at = NOW()
       WHERE id = $2 AND novel_id = $3
       RETURNING *`,
      [response.content, chapterId, id]
    );

    return NextResponse.json(updatedChapter);
  } catch (error) {
    console.error('Failed to regenerate chapter:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate chapter' },
      { status: 500 }
    );
  }
}
