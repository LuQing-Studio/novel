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
  return Math.max(1, Math.min(20, Math.floor(n)));
}

function safePositiveInt(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const int = Math.floor(n);
  return int > 0 ? int : null;
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

interface VolumeAIItem {
  number: number;
  title: string;
  outline: string;
  targetChapters?: number;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const count = safeInt(body.count, 5);

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

    // Ensure base volume rows exist (1..count)
    for (let i = 1; i <= count; i += 1) {
      await query(
        `INSERT INTO volumes (novel_id, number, title, outline)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (novel_id, number) DO NOTHING`,
        [id, i, `卷${i}`, '']
      );
    }

    const prompt = [
      '你是一位长篇网文策划编辑，请把「总纲」拆解为分卷大纲。',
      '',
      '小说信息：',
      `- 书名: ${novel.title}`,
      `- 类型: ${novel.genre}`,
      `- 灵感: ${novel.idea || '(未提供)'}`,
      `- 简介: ${novel.description || '(未提供)'}`,
      '',
      '总纲（overall_outline）：',
      novel.overallOutline || '(未提供)',
      '',
      `请输出 ${count} 卷的卷纲，每卷包含：`,
      '- number：卷序号（从1开始）',
      '- title：卷名（可读、有气质）',
      '- outline：卷纲（200~500字，包含本卷目标、冲突升级、阶段收束）',
      '- targetChapters：建议章数（可选，整数）',
      '',
      '输出要求：',
      '1) 必须是严格 JSON 数组，不要 markdown，不要额外说明',
      '2) 每卷要有明确推进，避免空话',
      '',
      'JSON 示例：',
      '[{"number":1,"title":"卷一","outline":"...","targetChapters":80}]',
    ].join('\n');

    const aiService = getAIService();
    const response = await aiService.generate({
      messages: [
        { role: 'system', content: '你是一个只输出 JSON 的写作策划助手。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      maxTokens: 2200,
    });

    const parsed = JSON.parse(stripJsonFence(response.content)) as unknown;
    if (!Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Invalid AI output' }, { status: 500 });
    }

    const items: VolumeAIItem[] = parsed
      .map((x: unknown) => x as Record<string, unknown>)
      .map((r) => ({
        number: safePositiveInt(r.number) ?? 0,
        title: safeString(r.title).trim(),
        outline: safeString(r.outline).trim(),
        targetChapters: r.targetChapters !== undefined ? safePositiveInt(r.targetChapters) ?? undefined : undefined,
      }))
      .filter((v) => v.number > 0 && v.number <= count && v.title && v.outline);

    if (items.length === 0) {
      return NextResponse.json({ error: 'Empty volumes from AI' }, { status: 500 });
    }

    for (const item of items) {
      await query(
        `UPDATE volumes
         SET title = $1, outline = $2, target_chapters = COALESCE($3, target_chapters), updated_at = NOW()
         WHERE novel_id = $4 AND number = $5`,
        [item.title, item.outline, item.targetChapters ?? null, id, item.number]
      );
    }

    const volumes = await query('SELECT * FROM volumes WHERE novel_id = $1 ORDER BY number', [id]);
    return NextResponse.json(volumes);
  } catch (error) {
    console.error('Failed to generate volumes:', error);
    return NextResponse.json({ error: 'Failed to generate volumes' }, { status: 500 });
  }
}
