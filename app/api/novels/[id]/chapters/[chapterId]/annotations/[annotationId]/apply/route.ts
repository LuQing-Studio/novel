import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireApiNovelOwner } from '@/lib/auth/api';
import { getAIService } from '@/lib/ai/factory';
import { getTechRAGClient } from '@/lib/lightrag/client';

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

function findBestRange(content: string, quote: string, preferredStart: number): { start: number; end: number } | null {
  if (!quote) return null;

  const positions: number[] = [];
  let idx = content.indexOf(quote);
  while (idx !== -1) {
    positions.push(idx);
    idx = content.indexOf(quote, idx + 1);
  }

  if (positions.length === 1) {
    const start = positions[0];
    return { start, end: start + quote.length };
  }

  if (positions.length > 1) {
    let best = positions[0];
    let bestDist = Math.abs(best - preferredStart);
    for (const p of positions) {
      const dist = Math.abs(p - preferredStart);
      if (dist < bestDist) {
        best = p;
        bestDist = dist;
      }
    }
    return { start: best, end: best + quote.length };
  }

  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string; annotationId: string }> }
) {
  try {
    const { id, chapterId, annotationId } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const chapter = await queryOne<{ id: string; content: string }>(
      'SELECT id, content FROM chapters WHERE id = $1 AND novel_id = $2',
      [chapterId, id]
    );
    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const annotation = await queryOne<{
      id: string;
      chapterId: string;
      status: string;
      quote: string;
      startOffset: number;
      endOffset: number;
      comment: string;
    }>(
      'SELECT * FROM chapter_annotations WHERE id = $1 AND chapter_id = $2',
      [annotationId, chapterId]
    );
    if (!annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
    }
    if (annotation.status !== 'open') {
      return NextResponse.json({ error: `Annotation is not open (current: ${annotation.status})` }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const instruction = safeString(body.instruction).trim() || annotation.comment;
    const techniqueTags = safeStringArray(body.techniqueTags ?? body.technique_tags);

    const range =
      findBestRange(chapter.content, annotation.quote, annotation.startOffset) ??
      (annotation.startOffset >= 0 &&
      annotation.endOffset <= chapter.content.length &&
      annotation.endOffset > annotation.startOffset
        ? { start: annotation.startOffset, end: annotation.endOffset }
        : null);

    if (!range) {
      return NextResponse.json({ error: 'Failed to locate annotated text in current chapter' }, { status: 409 });
    }

    const selected = chapter.content.slice(range.start, range.end);
    if (!selected.trim()) {
      return NextResponse.json({ error: 'Selected text is empty' }, { status: 409 });
    }

    const before = chapter.content.slice(Math.max(0, range.start - 500), range.start);
    const after = chapter.content.slice(range.end, Math.min(chapter.content.length, range.end + 500));

    let techRagContext = '';
    if (techniqueTags.length > 0) {
      try {
        const techClient = getTechRAGClient();
        const techQuery = [
          `技法标签: ${techniqueTags.join(', ')}`,
          '任务: 请给出可直接用于写作改写的技法要点（避免空话）。',
          '',
          '用户批注:',
          instruction,
        ].join('\n');
        const rag = await techClient.query({ query: techQuery, mode: 'hybrid' });
        techRagContext = rag?.response || '';
      } catch (error) {
        console.warn('Tech LightRAG query failed:', error);
      }
    }

    const promptParts = [
      '你是中文网文的资深编辑，擅长按批注对指定片段进行“定点重写”。',
      '你只需要输出“改写后的片段文本”，不要输出任何解释、标题、要点、markdown 或引号。',
      '必须保持人物名称、称谓、视角与时态一致；除非批注明确要求，否则不要新增剧情事实。',
      '',
      `批注/修改要求: ${instruction}`,
      '',
      techRagContext ? `技法参考(Tech RAG):\n${techRagContext.slice(0, 1200)}` : '技法参考(Tech RAG): (无)',
      '',
      '片段前文(供语气与衔接参考，可不完全照抄):',
      before ? before.slice(-800) : '(无)',
      '',
      '需要处理的片段(请只改写这段):',
      selected,
      '',
      '片段后文(供语气与衔接参考，可不完全照抄):',
      after ? after.slice(0, 800) : '(无)',
      '',
      '请输出改写后的片段:',
    ];

    const aiService = getAIService();
    const response = await aiService.generate({
      messages: [
        { role: 'system', content: '你是一个严格遵守指令的文本改写助手。' },
        { role: 'user', content: promptParts.join('\n') },
      ],
      temperature: 0.3,
      maxTokens: 1200,
    });

    const replacement = response.content.trim();
    if (!replacement) {
      return NextResponse.json({ error: 'Empty replacement' }, { status: 500 });
    }

    return NextResponse.json({ replacement });
  } catch (error) {
    console.error('Failed to apply annotation:', error);
    return NextResponse.json({ error: 'Failed to apply annotation' }, { status: 500 });
  }
}

