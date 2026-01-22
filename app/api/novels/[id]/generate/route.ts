import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getAIService } from '@/lib/ai/factory';
import { Novel, Chapter, Character, WorldSetting, Foreshadowing } from '@/lib/types';
import { getLightRAGClient } from '@/lib/lightrag/client';
import { countWords } from '@/lib/utils/text';
import { extractCharactersFromChapter, addExtractedCharacters } from '@/lib/ai/character-extractor';

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

    // 🔍 检索相关记忆
    // 1. 查询 LightRAG 获取相关上下文
    let ragContext = '';
    try {
      const lightRAGClient = getLightRAGClient();
      const ragResult = await lightRAGClient.query({ query: outline, mode: 'hybrid' });
      if (ragResult && ragResult.response) {
        ragContext = ragResult.response;
      }
    } catch (error) {
      console.warn('LightRAG query failed:', error);
    }

    // 2. 查询所有人物卡
    const characters = await query<Character>(
      'SELECT * FROM characters WHERE novel_id = $1',
      [id]
    );

    // 3. 查询所有世界观设定
    const worldSettings = await query<WorldSetting>(
      'SELECT * FROM world_settings WHERE novel_id = $1',
      [id]
    );

    // 4. 查询待揭示的伏笔
    const foreshadowing = await query<Foreshadowing>(
      'SELECT * FROM foreshadowing WHERE novel_id = $1 AND revealed = false',
      [id]
    );

    // 构建增强 prompt - 注入所有记忆上下文
    const promptParts = [
      `你是一位专业的网文作家。请根据以下信息生成第 ${nextChapterNumber} 章的内容:`,
      '',
      '小说信息:',
      `- 标题: ${novel.title}`,
      `- 类型: ${novel.genre}`,
      `- 简介: ${novel.description}`,
      '',
      `章节大纲: ${outline}`,
    ];

    // 添加前情提要
    if (chapters.length > 0) {
      promptParts.push('');
      promptParts.push('前情提要:');
      chapters.slice(-2).forEach(c => {
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

    // 添加伏笔(分为铺垫和揭示两个阶段)
    const BUILDUP_CHAPTERS = 5; // 提前5章开始铺垫

    // 需要开始铺垫的伏笔
    const buildupForeshadowing = foreshadowing.filter(
      f => f.plannedRevealChapter &&
           nextChapterNumber >= f.plannedRevealChapter - BUILDUP_CHAPTERS &&
           nextChapterNumber < f.plannedRevealChapter
    );

    // 待揭示的伏笔
    const revealForeshadowing = foreshadowing.filter(
      f => f.plannedRevealChapter && f.plannedRevealChapter <= nextChapterNumber
    );

    if (buildupForeshadowing.length > 0) {
      promptParts.push('');
      promptParts.push('需要开始铺垫的伏笔(自然提及,不要揭示):');
      buildupForeshadowing.forEach(f => {
        promptParts.push(`- ${f.content} (计划第${f.plannedRevealChapter}章揭示)`);
      });
    }

    if (revealForeshadowing.length > 0) {
      promptParts.push('');
      promptParts.push('待揭示的伏笔(本章应该揭示或推进):');
      revealForeshadowing.forEach(f => {
        promptParts.push(`- ${f.content} (计划第${f.plannedRevealChapter}章揭示)`);
      });
    }

    // 添加 RAG 上下文
    if (ragContext) {
      promptParts.push('');
      promptParts.push('相关上下文:');
      promptParts.push(ragContext.substring(0, 500));
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
    promptParts.push('');
    promptParts.push('请直接输出章节内容,不要包含任何额外说明。');

    const prompt = promptParts.join('\n');

    // 调用 AI 生成
    const aiService = getAIService();

    const response = await aiService.generate({
      messages: [
        { role: 'system', content: '你是一位专业的网文作家,擅长创作引人入胜的故事。你会严格遵守人物设定和世界观规则,确保长期一致性。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      maxTokens: 4000,
    });

    // 计算字数
    const wordCount = countWords(response.content);

    // 保存章节
    const [chapter] = await query<Chapter>(
      `INSERT INTO chapters (novel_id, number, title, content, outline, word_count)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, nextChapterNumber, `第${nextChapterNumber}章`, response.content, outline, wordCount]
    );

    // 更新小说统计
    await query(
      'UPDATE novels SET chapter_count = chapter_count + 1, word_count = word_count + $2, updated_at = NOW() WHERE id = $1',
      [id, wordCount]
    );

    // 自动提取人物
    try {
      const characters = await extractCharactersFromChapter(id, chapter.id, nextChapterNumber, response.content);
      await addExtractedCharacters(id, nextChapterNumber, characters);
    } catch (error) {
      console.warn('Auto character extraction failed:', error);
    }

    // 自动上传到LightRAG
    try {
      const lightRAGClient = getLightRAGClient();
      await lightRAGClient.uploadDocument({
        content: response.content,
        description: `${novel.title} - 第${nextChapterNumber}章`
      });
    } catch (error) {
      console.warn('Auto LightRAG upload failed:', error);
    }

    return NextResponse.json(chapter);
  } catch (error) {
    console.error('Failed to generate chapter:', error);
    return NextResponse.json(
      { error: 'Failed to generate chapter' },
      { status: 500 }
    );
  }
}
