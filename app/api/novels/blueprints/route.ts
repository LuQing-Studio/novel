import { NextResponse } from 'next/server';
import { getAIService } from '@/lib/ai/factory';
import { requireApiUser } from '@/lib/auth/api';

interface BlueprintRequestBody {
  idea?: unknown;
  genre?: unknown;
  count?: unknown;
}

interface NovelBlueprint {
  title: string;
  description: string;
  overall_outline: string;
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function safeInt(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(10, Math.floor(n)));
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

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser();
    if ('response' in auth) return auth.response;

    const body = (await request.json()) as BlueprintRequestBody;
    const idea = safeString(body.idea).trim();
    const genre = safeString(body.genre).trim() || '网文';
    const count = safeInt(body.count, 3);

    if (!idea) {
      return NextResponse.json({ error: 'Idea is required' }, { status: 400 });
    }

    const prompt = [
      '你是一位顶级网文策划编辑，擅长把一句话灵感扩展成可写的长篇结构。',
      '',
      `灵感(idea): ${idea}`,
      `类型(genre): ${genre}`,
      '',
      `请生成 ${count} 个「完全不同走向」的总纲候选，每个候选包含：`,
      '- title：书名（有网文味，但不要土到尴尬）',
      '- description：一句话卖点+主角目标（100~180字）',
      '- overall_outline：总纲（起承转合，包含主线矛盾、阶段性目标、关键伏笔与回收方向，400~900字）',
      '',
      '输出要求：',
      '1) 必须是严格 JSON（数组），不要 markdown，不要额外说明',
      '2) overall_outline 用中文分段，尽量可执行（不是空话）',
      '',
      'JSON 格式示例：',
      '[',
      '  { "title": "...", "description": "...", "overall_outline": "..." }',
      ']',
    ].join('\n');

    const aiService = getAIService();
    const response = await aiService.generate({
      messages: [
        { role: 'system', content: '你是一个只输出 JSON 的小说策划助手。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      maxTokens: 2500,
    });

    const jsonText = stripJsonFence(response.content);
    const parsed = JSON.parse(jsonText) as unknown;
    if (!Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Invalid blueprint format' }, { status: 500 });
    }

    const blueprints: NovelBlueprint[] = parsed
      .slice(0, count)
      .map((item: unknown) => {
        const record = item as Record<string, unknown>;
        return {
          title: safeString(record.title).trim(),
          description: safeString(record.description).trim(),
          overall_outline: safeString(record.overall_outline ?? record.overallOutline).trim(),
        };
      })
      .filter((b) => b.title && b.description && b.overall_outline);

    if (blueprints.length === 0) {
      return NextResponse.json({ error: 'Empty blueprints' }, { status: 500 });
    }

    return NextResponse.json({ blueprints });
  } catch (error) {
    console.error('Failed to generate blueprints:', error);
    return NextResponse.json({ error: 'Failed to generate blueprints' }, { status: 500 });
  }
}

