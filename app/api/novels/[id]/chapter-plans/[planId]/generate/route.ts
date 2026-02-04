import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireApiNovel } from '@/lib/auth/api';
import { getAIService } from '@/lib/ai/factory';
import { Chapter, Character, WorldSetting, Foreshadowing } from '@/lib/types';
import { getStoryRAGClient, getTechRAGClient } from '@/lib/lightrag/client';
import { countWords } from '@/lib/utils/text';
import { extractCharactersFromChapter, addExtractedCharacters } from '@/lib/ai/character-extractor';

const RECENT_CHAPTER_LIMIT = 2;
const MAX_RELEVANT_CHARACTERS = 12;
const MAX_RELEVANT_WORLD_SETTINGS = 12;
const MAX_STORY_RAG_CONTEXT_CHARS = 1200;
const MAX_TECH_RAG_CONTEXT_CHARS = 1200;
const BUILDUP_CHAPTERS = 5;
const MAX_LONG_TERM_FORESHADOWING = 6;

interface ChapterPlanRow {
  id: string;
  novelId: string;
  volumeId: string;
  number: number;
  title: string;
  outline: string;
  status: string;
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function safeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => safeString(v).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function outlineMentionScore(outline: string, needle: string): number {
  if (!outline || !needle) return 0;
  return outline.includes(needle) ? 100 : 0;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; planId: string }> }
) {
  try {
    const url = new URL(request.url);
    const streamMode = url.searchParams.get('stream') === '1';

    const { id, planId } = await params;
    const auth = await requireApiNovel(id);
    if ('response' in auth) return auth.response;

    const { novel } = auth;

    const plan = await queryOne<ChapterPlanRow>(
      'SELECT id, novel_id, volume_id, number, title, outline, status FROM chapter_plans WHERE id = $1 AND novel_id = $2',
      [planId, id]
    );
    if (!plan) {
      return NextResponse.json({ error: 'Chapter plan not found' }, { status: 404 });
    }
    if (plan.status !== 'confirmed') {
      return NextResponse.json({ error: 'Chapter plan must be confirmed before generating content' }, { status: 400 });
    }

    const confirmedPlan = plan;

    const existingChapter = await queryOne<{ id: string }>(
      'SELECT id FROM chapters WHERE novel_id = $1 AND plan_id = $2',
      [id, planId]
    );
    if (existingChapter) {
      return NextResponse.json({ error: 'Chapter already exists for this plan' }, { status: 409 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const techniqueTags = safeStringArray(body.techniqueTags ?? body.technique_tags);

    const chapterNumber = plan.number;
    const outline = safeString(plan.outline).trim();

    // Recent chapters (allow "skip writing": only consider generated chapters < plan.number)
    const recentChapters = (
      await query<Pick<Chapter, 'number' | 'title' | 'outline' | 'content'>>(
        'SELECT number, title, outline, content FROM chapters WHERE novel_id = $1 AND number < $2 ORDER BY number DESC LIMIT $3',
        [id, chapterNumber, RECENT_CHAPTER_LIMIT]
      )
    ).reverse();

    // Story RAG context
    let storyRagContext = '';
    try {
      const storyClient = getStoryRAGClient();
      const ragResult = await storyClient.query({ query: outline || `${plan.title}`, mode: 'hybrid' });
      if (ragResult?.response) {
        storyRagContext = ragResult.response;
      }
    } catch (error) {
      console.warn('Story LightRAG query failed:', error);
    }

    // Tech RAG context (optional)
    let techRagContext = '';
    if (techniqueTags.length > 0) {
      try {
        const techClient = getTechRAGClient();
        const techQuery = [
          `技法标签: ${techniqueTags.join(', ')}`,
          '任务: 请给出可执行的写作技法要点（用来指导改写/扩写/氛围渲染），不要讲空话。',
          '要点应可直接用于写作（例如：光影/气味/心理暗示/节奏切分/对话张力等）。',
          '',
          '章节大纲:',
          outline || plan.title,
        ].join('\n');

        const ragResult = await techClient.query({ query: techQuery, mode: 'hybrid' });
        if (ragResult?.response) {
          techRagContext = ragResult.response;
        }
      } catch (error) {
        console.warn('Tech LightRAG query failed:', error);
      }
    }

    // Relevant characters (Top-K)
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
      [id, outline, chapterNumber, MAX_RELEVANT_CHARACTERS]
    );

    // Relevant world settings
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

    const foreshadowing = await query<Foreshadowing>(
      'SELECT * FROM foreshadowing WHERE novel_id = $1 AND revealed = false',
      [id]
    );

    const buildupForeshadowing = foreshadowing.filter(
      (f) =>
        f.plannedRevealChapter &&
        chapterNumber >= f.plannedRevealChapter - BUILDUP_CHAPTERS &&
        chapterNumber < f.plannedRevealChapter
    );

    const revealForeshadowing = foreshadowing.filter(
      (f) => f.plannedRevealChapter && f.plannedRevealChapter <= chapterNumber
    );

    const longTermForeshadowing = foreshadowing
      .filter((f) => {
        if (!f.plannedRevealChapter) return true;
        return f.plannedRevealChapter > chapterNumber + BUILDUP_CHAPTERS;
      })
      .map((f) => ({
        item: f,
        score: outlineMentionScore(outline, f.content) + (f.plantedChapter ?? 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_LONG_TERM_FORESHADOWING)
      .map((x) => x.item);

    const promptParts: string[] = [
      `你是一位专业的网文作家。请根据以下信息生成第 ${chapterNumber} 章的正文内容。`,
      '',
      '小说信息:',
      `- 标题: ${novel.title}`,
      `- 类型: ${novel.genre}`,
      `- 简介: ${novel.description || ''}`,
      `- 灵感: ${(novel as unknown as { idea?: string }).idea || ''}`,
      '',
      `本章章纲(已确认): ${outline || plan.title}`,
    ];

    if (recentChapters.length > 0) {
      promptParts.push('');
      promptParts.push('前情提要(最近已写正文的章节):');
      recentChapters.forEach((c) => {
        promptParts.push(`第${c.number}章: ${c.title}`);
        promptParts.push((c.outline || c.content.substring(0, 200)).trim());
      });
    }

    if (characters.length > 0) {
      promptParts.push('');
      promptParts.push('人物设定(与本章相关的Top-K):');
      characters.forEach((c) => {
        promptParts.push(`- ${c.name}: ${c.description}${c.status ? ` (状态: ${c.status})` : ''}`);
      });
    }

    if (worldSettings.length > 0) {
      promptParts.push('');
      promptParts.push('世界观设定(与本章相关的Top-K):');
      worldSettings.forEach((s) => {
        const title = s.title ? ` ${s.title}` : '';
        promptParts.push(`- [${s.category}]${title}: ${s.content}`);
      });
    }

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
        const planText = f.plannedRevealChapter ? `计划第${f.plannedRevealChapter}章揭示` : '揭示章节未定';
        promptParts.push(`- ${f.content} (${planText})`);
      });
    }

    if (storyRagContext) {
      promptParts.push('');
      promptParts.push('剧情记忆检索(Story RAG):');
      promptParts.push(storyRagContext.substring(0, MAX_STORY_RAG_CONTEXT_CHARS));
    }

    if (techRagContext) {
      promptParts.push('');
      promptParts.push(`技法参考(Tech RAG, tags: ${techniqueTags.join(', ')}):`);
      promptParts.push(techRagContext.substring(0, MAX_TECH_RAG_CONTEXT_CHARS));
    }

    promptParts.push('');
    promptParts.push('要求:');
    promptParts.push('1. 生成约 3000 字的章节正文');
    promptParts.push('2. 严格遵守本章章纲（不要跑题）');
    promptParts.push('3. 保持与前文连贯，避免信息矛盾');
    promptParts.push('4. 严格遵守人物设定与世界观规则');
    promptParts.push('5. 文风要有画面感与节奏（避免说明文）');
    promptParts.push('6. 请直接输出正文，不要包含任何额外说明。');

    const prompt = promptParts.join('\n');
    const aiService = getAIService();

    const aiRequest = {
      messages: [
        { role: 'system', content: '你是一位专业的网文作家，擅长氛围与画面感。你会严格遵守章纲与设定。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      maxTokens: 4000,
    } as const;

    async function persistChapter(content: string): Promise<Chapter> {
      const trimmed = content.trim();
      const wordCount = countWords(trimmed);

      const chapterTitle = `第${chapterNumber}章 ${confirmedPlan.title}`.trim();

      const [chapter] = await query<Chapter>(
        `INSERT INTO chapters (novel_id, volume_id, plan_id, number, title, content, outline, word_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [id, confirmedPlan.volumeId, planId, chapterNumber, chapterTitle, trimmed, outline, wordCount]
      );

      // Mark plan drafted
      await query(
        `UPDATE chapter_plans
         SET status = 'drafted', updated_at = NOW()
         WHERE id = $1 AND novel_id = $2`,
        [planId, id]
      );

      // Update novel stats (robust for skip writing / deletion)
      await query(
        `UPDATE novels
         SET chapter_count = COALESCE((SELECT COUNT(*) FROM chapters WHERE novel_id = $1), 0),
             word_count = COALESCE((SELECT SUM(word_count) FROM chapters WHERE novel_id = $1), 0),
             updated_at = NOW()
         WHERE id = $1`,
        [id]
      );

      // Auto extract characters
      try {
        const extracted = await extractCharactersFromChapter(
          id,
          chapter.id,
          chapterNumber,
          trimmed
        );
        await addExtractedCharacters(id, chapterNumber, extracted);
      } catch (error) {
        console.warn('Auto character extraction failed:', error);
      }

      // Auto upload to Story LightRAG
	      try {
	        const storyClient = getStoryRAGClient();
	        await storyClient.uploadDocument({
	          content: trimmed,
	          description: `${novel.title} - 第${chapterNumber}章: ${confirmedPlan.title}`,
	        });
	      } catch (error) {
	        console.warn('Auto Story LightRAG upload failed:', error);
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
            send({ type: 'start', chapterNumber });

            for await (const delta of aiService.stream(aiRequest)) {
              if (request.signal.aborted) {
                return;
              }
              content += delta;
              send({ type: 'delta', text: delta });
            }

            const chapter = await persistChapter(content);
            send({ type: 'done', chapterId: chapter.id, planId });
          } catch (error) {
            console.error('Failed to stream generate chapter by plan:', error);
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
    console.error('Failed to generate chapter by plan:', error);
    return NextResponse.json({ error: 'Failed to generate chapter' }, { status: 500 });
  }
}
