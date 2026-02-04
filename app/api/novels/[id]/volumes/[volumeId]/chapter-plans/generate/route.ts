import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireApiNovelOwner } from '@/lib/auth/api';
import { getAIService } from '@/lib/ai/factory';

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function safeInt(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(50, Math.floor(n)));
}

function stripJsonFence(raw: string): string {
  let text = raw.trim();
  if (text.startsWith('```json')) {
    text = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  } else if (text.startsWith('```')) {
    text = text.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  }
  return text.trim();
}

interface PlanAIItem {
  title: string;
  outline: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; volumeId: string }> }
) {
  try {
    const { id, volumeId } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const requested = safeInt(body.count, 10);

    const novel = await queryOne<{
      id: string;
      title: string;
      genre: string;
      description: string;
      idea: string;
      overallOutline: string;
    }>('SELECT * FROM novels WHERE id = $1', [id]);
    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    const volume = await queryOne<{
      id: string;
      number: number;
      title: string;
      outline: string;
      targetChapters: number | null;
    }>('SELECT * FROM volumes WHERE id = $1 AND novel_id = $2', [volumeId, id]);
    if (!volume) {
      return NextResponse.json({ error: 'Volume not found' }, { status: 404 });
    }

    const existingCountRow = await queryOne<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM chapter_plans WHERE volume_id = $1',
      [volumeId]
    );
    const existingCount = existingCountRow?.count ?? 0;
    const remaining =
      typeof volume.targetChapters === 'number' ? Math.max(0, volume.targetChapters - existingCount) : requested;
    if (remaining <= 0) {
      return NextResponse.json({ error: 'Volume chapter target reached' }, { status: 400 });
    }

    const count = Math.min(requested, remaining);

    const maxPlanNumberRow = await queryOne<{ max: number }>(
      'SELECT COALESCE(MAX(number), 0)::int AS max FROM chapter_plans WHERE novel_id = $1',
      [id]
    );
    const startNumber = (maxPlanNumberRow?.max ?? 0) + 1;

    const lastPlans = await query<{ number: number; title: string; outline: string }>(
      'SELECT number, title, outline FROM chapter_plans WHERE volume_id = $1 ORDER BY number DESC LIMIT 6',
      [volumeId]
    );

    const prompt = [
      '你是一位网文章节大纲策划，请为指定分卷生成「下一批」章节梗概。',
      '',
      '小说信息：',
      `- 书名: ${novel.title}`,
      `- 类型: ${novel.genre}`,
      `- 灵感: ${novel.idea || '(未提供)'}`,
      `- 简介: ${novel.description || '(未提供)'}`,
      '',
      '总纲：',
      novel.overallOutline || '(未提供)',
      '',
      `分卷信息：第${volume.number}卷《${volume.title}》`,
      '卷纲：',
      volume.outline || '(未提供)',
      '',
      `当前该卷已存在章纲数量: ${existingCount}`,
      `现在要生成下一批: ${count} 章`,
      `这些新章将被分配为全书连续章节号：从第${startNumber}章开始连续 ${count} 章`,
      '',
      '该卷最近已有章纲（供承接用，不要重复）：',
      lastPlans.length
        ? lastPlans
            .slice()
            .reverse()
            .map((p) => `- 第${p.number}章 ${p.title}: ${(p.outline || '').slice(0, 180)}`)
            .join('\n')
        : '(无)',
      '',
      '输出要求：',
      '1) 只输出严格 JSON 数组，不要 markdown，不要额外说明',
      '2) 每章 outline 100~200 字左右，信息密度高，可执行（包含冲突/推进/收束点）',
      '3) 每章 title 要简短有记忆点',
      '',
      'JSON 格式：',
      '[{"title":"...","outline":"..."}]',
    ].join('\n');

    const aiService = getAIService();
    const response = await aiService.generate({
      messages: [
        { role: 'system', content: '你是一个只输出 JSON 的章纲生成器。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      maxTokens: 2200,
    });

    const parsed = JSON.parse(stripJsonFence(response.content)) as unknown;
    if (!Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Invalid AI output' }, { status: 500 });
    }

    const items: PlanAIItem[] = parsed
      .map((x: unknown) => x as Record<string, unknown>)
      .map((r) => ({
        title: safeString(r.title).trim(),
        outline: safeString(r.outline).trim(),
      }))
      .filter((p) => p.title && p.outline)
      .slice(0, count);

    if (items.length === 0) {
      return NextResponse.json({ error: 'Empty plans from AI' }, { status: 500 });
    }

    const created: unknown[] = [];
    for (let i = 0; i < items.length; i += 1) {
      const number = startNumber + i;
      const item = items[i];
      const [plan] = await query(
        `INSERT INTO chapter_plans (novel_id, volume_id, number, title, outline, status)
         VALUES ($1, $2, $3, $4, $5, 'draft')
         RETURNING *`,
        [id, volumeId, number, item.title, item.outline]
      );
      created.push(plan);
    }

    return NextResponse.json({ created });
  } catch (error) {
    console.error('Failed to generate chapter plans:', error);
    return NextResponse.json({ error: 'Failed to generate chapter plans' }, { status: 500 });
  }
}

