import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireApiNovel } from '@/lib/auth/api';
import { getAIService } from '@/lib/ai/factory';
import { Chapter, Character, WorldSetting, Foreshadowing } from '@/lib/types';
import { getLightRAGClient } from '@/lib/lightrag/client';
import { countWords } from '@/lib/utils/text';
import { extractCharactersFromChapter, addExtractedCharacters } from '@/lib/ai/character-extractor';

const RECENT_CHAPTER_LIMIT = 2;
const MAX_RELEVANT_CHARACTERS = 12;
const MAX_RELEVANT_WORLD_SETTINGS = 12;
const MAX_RAG_CONTEXT_CHARS = 1200;
const BUILDUP_CHAPTERS = 5; // 提前 N 章开始铺垫
const MAX_LONG_TERM_FORESHADOWING = 6;

interface ChapterCountRow {
  count: number;
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function outlineMentionScore(outline: string, needle: string): number {
  if (!outline || !needle) return 0;
  return outline.includes(needle) ? 100 : 0;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const url = new URL(request.url);
    const streamMode = url.searchParams.get('stream') === '1';

    const { id } = await params;
    const body = await request.json();
    const outline = safeString((body as { outline?: unknown }).outline).trim();

    if (!outline) {
      return NextResponse.json({ error: 'Outline is required' }, { status: 400 });
    }

    const auth = await requireApiNovel(id);
    if ('response' in auth) return auth.response;

    const { novel } = auth;

    // 获取下一章编号（避免拉取全量章节 content 导致性能问题）
    const chapterCount = await queryOne<ChapterCountRow>(
      'SELECT COUNT(*)::int AS count FROM chapters WHERE novel_id = $1',
      [id]
    );
    const nextChapterNumber = (chapterCount?.count ?? 0) + 1;

    // 仅获取最近 N 章用于前情提要
    const recentChapters = (
      await query<Pick<Chapter, 'number' | 'title' | 'outline' | 'content'>>(
        'SELECT number, title, outline, content FROM chapters WHERE novel_id = $1 ORDER BY number DESC LIMIT $2',
        [id, RECENT_CHAPTER_LIMIT]
      )
    ).reverse();

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

    // 2. 查询与本章更相关的人物卡（避免全量注入导致上下文膨胀）
    const characters = await query<Character>(
      `
        SELECT *,
          (
            CASE WHEN STRPOS($2, name) > 0 THEN 100 ELSE 0 END
            + CASE
                WHEN last_appearance IS NULL THEN 0
                ELSE GREATEST(0, 10 - ($3 - last_appearance))
              END
          ) AS relevance_score
        FROM characters
        WHERE novel_id = $1
        ORDER BY relevance_score DESC, last_appearance DESC NULLS LAST, first_appearance ASC NULLS LAST
        LIMIT $4
      `,
      [id, outline, nextChapterNumber, MAX_RELEVANT_CHARACTERS]
    );

    // 3. 查询与本章更相关的世界观设定
    const recentChapterNumbers = recentChapters.map((c) => c.number);
    const worldSettings = await query<WorldSetting>(
      `
        SELECT *,
          (
            CASE WHEN STRPOS($2, title) > 0 THEN 100 ELSE 0 END
            + CASE
                WHEN related_chapters IS NULL THEN 0
                WHEN related_chapters && $3 THEN 20
                ELSE 0
              END
          ) AS relevance_score
        FROM world_settings
        WHERE novel_id = $1
        ORDER BY relevance_score DESC, created_at DESC
        LIMIT $4
      `,
      [id, outline, recentChapterNumbers, MAX_RELEVANT_WORLD_SETTINGS]
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
    if (recentChapters.length > 0) {
      promptParts.push('');
      promptParts.push('前情提要:');
      recentChapters.forEach((c) => {
        promptParts.push(`第${c.number}章: ${c.title}`);
        promptParts.push((c.outline || c.content.substring(0, 200)).trim());
      });
    }

    // 添加人物设定
    if (characters.length > 0) {
      promptParts.push('');
      promptParts.push('人物设定(与本章相关的Top-K):');
      characters.forEach((c) => {
        promptParts.push(`- ${c.name}: ${c.description}${c.status ? ` (状态: ${c.status})` : ''}`);
      });
    }

    // 添加世界观设定
    if (worldSettings.length > 0) {
      promptParts.push('');
      promptParts.push('世界观设定(与本章相关的Top-K):');
      worldSettings.forEach((s) => {
        const title = s.title ? ` ${s.title}` : '';
        promptParts.push(`- [${s.category}]${title}: ${s.content}`);
      });
    }

    // 添加伏笔(分为铺垫和揭示两个阶段)

    // 需要开始铺垫的伏笔
    const buildupForeshadowing = foreshadowing.filter(
      (f) =>
        f.plannedRevealChapter &&
        nextChapterNumber >= f.plannedRevealChapter - BUILDUP_CHAPTERS &&
        nextChapterNumber < f.plannedRevealChapter
    );

    // 待揭示的伏笔
    const revealForeshadowing = foreshadowing.filter(
      (f) => f.plannedRevealChapter && f.plannedRevealChapter <= nextChapterNumber
    );

    // 长期未揭示的伏笔（作为背景约束，避免写崩）
    const longTermForeshadowing = foreshadowing
      .filter((f) => {
        if (!f.plannedRevealChapter) return true;
        return f.plannedRevealChapter > nextChapterNumber + BUILDUP_CHAPTERS;
      })
      .map((f) => ({
        item: f,
        score: outlineMentionScore(outline, f.content) + (f.plantedChapter ?? 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_LONG_TERM_FORESHADOWING)
      .map((x) => x.item);

    if (buildupForeshadowing.length > 0) {
      promptParts.push('');
      promptParts.push('需要开始铺垫的伏笔(自然提及,不要揭示):');
      buildupForeshadowing.forEach((f) => {
        promptParts.push(`- ${f.content} (计划第${f.plannedRevealChapter}章揭示)`);
      });
    }

    if (revealForeshadowing.length > 0) {
      promptParts.push('');
      promptParts.push('待揭示的伏笔(本章应该揭示或推进):');
      revealForeshadowing.forEach((f) => {
        promptParts.push(`- ${f.content} (计划第${f.plannedRevealChapter}章揭示)`);
      });
    }

    if (longTermForeshadowing.length > 0) {
      promptParts.push('');
      promptParts.push('长期未回收的伏笔(背景约束: 不要直接揭示,但不要写出冲突情节):');
      longTermForeshadowing.forEach((f) => {
        const plan = f.plannedRevealChapter ? `计划第${f.plannedRevealChapter}章揭示` : '揭示章节未定';
        promptParts.push(`- ${f.content} (${plan})`);
      });
    }

    // 添加 RAG 上下文
    if (ragContext) {
      promptParts.push('');
      promptParts.push('相关上下文:');
      promptParts.push(ragContext.substring(0, MAX_RAG_CONTEXT_CHARS));
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

    const aiRequest = {
      messages: [
        { role: 'system', content: '你是一位专业的网文作家,擅长创作引人入胜的故事。你会严格遵守人物设定和世界观规则,确保长期一致性。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      maxTokens: 4000,
    } as const;

    async function persistChapter(content: string): Promise<Chapter> {
      const trimmed = content.trim();

      // 计算字数
      const wordCount = countWords(trimmed);

      // 保存章节
      const [chapter] = await query<Chapter>(
        `INSERT INTO chapters (novel_id, number, title, content, outline, word_count)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [id, nextChapterNumber, `第${nextChapterNumber}章`, trimmed, outline, wordCount]
      );

      // 更新小说统计
      await query(
        'UPDATE novels SET chapter_count = chapter_count + 1, word_count = word_count + $2, updated_at = NOW() WHERE id = $1',
        [id, wordCount]
      );

      // 自动提取人物
      try {
        const extracted = await extractCharactersFromChapter(
          id,
          chapter.id,
          nextChapterNumber,
          trimmed
        );
        await addExtractedCharacters(id, nextChapterNumber, extracted);
      } catch (error) {
        console.warn('Auto character extraction failed:', error);
      }

      // 自动上传到 LightRAG
      try {
        const lightRAGClient = getLightRAGClient();
        await lightRAGClient.uploadDocument({
          content: trimmed,
          description: `${novel.title} - 第${nextChapterNumber}章`,
        });
      } catch (error) {
        console.warn('Auto LightRAG upload failed:', error);
      }

      return chapter;
    }

    if (streamMode) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const send = (payload: unknown) => {
            controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
          };

          let content = '';

          try {
            send({ type: 'start', chapterNumber: nextChapterNumber });

            for await (const delta of aiService.stream(aiRequest)) {
              if (request.signal.aborted) {
                return;
              }

              content += delta;
              send({ type: 'delta', text: delta });
            }

            const chapter = await persistChapter(content);
            send({ type: 'done', chapterId: chapter.id });
          } catch (error) {
            console.error('Failed to stream generate chapter:', error);
            send({ type: 'error', error: 'Failed to generate chapter' });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    const response = await aiService.generate(aiRequest);
    const chapter = await persistChapter(response.content);
    return NextResponse.json(chapter);
  } catch (error) {
    console.error('Failed to generate chapter:', error);
    return NextResponse.json(
      { error: 'Failed to generate chapter' },
      { status: 500 }
    );
  }
}
