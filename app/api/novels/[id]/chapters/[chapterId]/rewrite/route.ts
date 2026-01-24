import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireApiNovelOwner } from '@/lib/auth/api';
import { getAIService } from '@/lib/ai/factory';

interface RewriteRequestBody {
  text: unknown;
  instruction: unknown;
  preset?: unknown;
  before?: unknown;
  after?: unknown;
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

type RewritePreset =
  | 'rewrite'
  | 'expand'
  | 'shorten'
  | 'more-dialogue'
  | 'more-sensory'
  | 'more-tense'
  | 'custom';

function normalizePreset(value: unknown): RewritePreset {
  const preset = safeString(value).trim();
  switch (preset) {
    case 'rewrite':
    case 'expand':
    case 'shorten':
    case 'more-dialogue':
    case 'more-sensory':
    case 'more-tense':
    case 'custom':
      return preset;
    default:
      return 'rewrite';
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { id, chapterId } = await params;

    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const chapter = await queryOne<{ id: string }>(
      'SELECT id FROM chapters WHERE id = $1 AND novel_id = $2',
      [chapterId, id]
    );
    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const body = (await request.json()) as RewriteRequestBody;

    const text = safeString(body.text).trim();
    const instruction = safeString(body.instruction).trim();
    const preset = normalizePreset(body.preset);
    const before = safeString(body.before);
    const after = safeString(body.after);

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (text.length < 20) {
      return NextResponse.json({ error: 'Selected text is too short (min 20 chars)' }, { status: 400 });
    }

    if (text.length > 2000) {
      return NextResponse.json({ error: 'Text is too long' }, { status: 400 });
    }

    if (!instruction) {
      return NextResponse.json({ error: 'Instruction is required' }, { status: 400 });
    }

    if (instruction.length > 300) {
      return NextResponse.json({ error: 'Instruction is too long' }, { status: 400 });
    }

    const aiService = getAIService();

    const inputLength = text.length;
    const { minRatio, maxRatio } =
      preset === 'expand'
        ? { minRatio: 1.0, maxRatio: 4.0 }
        : preset === 'shorten'
          ? { minRatio: 0.2, maxRatio: 1.1 }
          : preset === 'custom'
            ? { minRatio: 0.2, maxRatio: 4.0 }
            : { minRatio: 0.5, maxRatio: 2.0 };

    const minLen = Math.max(10, Math.floor(inputLength * minRatio));
    const maxLen = Math.max(40, Math.ceil(inputLength * maxRatio));

    const promptParts = [
      '你是中文网文的资深编辑，擅长对指定片段进行“局部改写/扩写/润色”。',
      '你只需要输出“改写后的片段文本”，不要输出任何解释、标题、要点、markdown 或引号。',
      '必须保持人物名称、称谓、视角与时态一致；除非指令明确要求，否则不要新增剧情事实。',
      `长度约束: 原片段约 ${inputLength} 字符；请将输出控制在 ${minLen}-${maxLen} 字符范围内（除非指令明确要求扩写/精简）。`,
      '输出必须只包含改写后的片段本身，不要包含前文/后文的任何句子。',
      '',
      `编辑指令: ${instruction}`,
      '',
      '片段前文(供语气与衔接参考，可不完全照抄):',
      before ? before.slice(-800) : '(无)',
      '',
      '需要处理的片段(请只改写这段):',
      text,
      '',
      '片段后文(供语气与衔接参考，可不完全照抄):',
      after ? after.slice(0, 800) : '(无)',
      '',
      '请输出改写后的片段:',
    ];

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

    if (replacement.length < minLen || replacement.length > maxLen) {
      return NextResponse.json(
        { error: 'Model output length is out of bounds. Please adjust selection or preset.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ replacement });
  } catch (error) {
    console.error('Failed to rewrite selection:', error);
    return NextResponse.json({ error: 'Failed to rewrite selection' }, { status: 500 });
  }
}
