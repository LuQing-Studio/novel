import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireApiNovelOwner } from '@/lib/auth/api';

interface ChapterPlanRow {
  id: string;
  novelId: string;
  volumeId: string;
  number: number;
  title: string;
  outline: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

async function nextPlanVersionNumber(planId: string): Promise<number> {
  const row = await queryOne<{ next: number }>(
    'SELECT (COALESCE(MAX(version_number), 0) + 1)::int AS next FROM chapter_plan_versions WHERE chapter_plan_id = $1',
    [planId]
  );
  return row?.next ?? 1;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; planId: string }> }
) {
  try {
    const { id, planId } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const plan = await queryOne<ChapterPlanRow>(
      'SELECT * FROM chapter_plans WHERE id = $1 AND novel_id = $2',
      [planId, id]
    );
    if (!plan) {
      return NextResponse.json({ error: 'Chapter plan not found' }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Failed to fetch chapter plan:', error);
    return NextResponse.json({ error: 'Failed to fetch chapter plan' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; planId: string }> }
) {
  try {
    const { id, planId } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const plan = await queryOne<ChapterPlanRow>(
      'SELECT * FROM chapter_plans WHERE id = $1 AND novel_id = $2',
      [planId, id]
    );
    if (!plan) {
      return NextResponse.json({ error: 'Chapter plan not found' }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const title = body.title !== undefined ? safeString(body.title).trim() : plan.title;
    const outline = body.outline !== undefined ? safeString(body.outline).trim() : plan.outline;
    const changeDescription = safeString(body.changeDescription ?? body.change_description).trim();

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    // Strict locking: if plan is confirmed/drafted/done, save previous version then revert to draft
    const locked = plan.status !== 'draft';
    if (locked) {
      const versionNumber = await nextPlanVersionNumber(planId);
      await query(
        `INSERT INTO chapter_plan_versions (chapter_plan_id, version_number, title, outline, created_by, change_description)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [planId, versionNumber, plan.title, plan.outline, 'user', changeDescription || '编辑已锁定章纲（保存旧版本并回退草稿）']
      );

      const [updated] = await query<ChapterPlanRow>(
        `UPDATE chapter_plans
         SET title = $1, outline = $2, status = 'draft', updated_at = NOW()
         WHERE id = $3 AND novel_id = $4
         RETURNING *`,
        [title, outline, planId, id]
      );
      return NextResponse.json(updated);
    }

    const [updated] = await query<ChapterPlanRow>(
      `UPDATE chapter_plans
       SET title = $1, outline = $2, updated_at = NOW()
       WHERE id = $3 AND novel_id = $4
       RETURNING *`,
      [title, outline, planId, id]
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update chapter plan:', error);
    return NextResponse.json({ error: 'Failed to update chapter plan' }, { status: 500 });
  }
}

