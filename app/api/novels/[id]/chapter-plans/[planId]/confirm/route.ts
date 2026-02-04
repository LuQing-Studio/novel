import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireApiNovelOwner } from '@/lib/auth/api';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; planId: string }> }
) {
  try {
    const { id, planId } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const plan = await queryOne<{ id: string; status: string }>(
      'SELECT id, status FROM chapter_plans WHERE id = $1 AND novel_id = $2',
      [planId, id]
    );

    if (!plan) {
      return NextResponse.json({ error: 'Chapter plan not found' }, { status: 404 });
    }

    if (plan.status !== 'draft') {
      return NextResponse.json(
        { error: `Only draft plans can be confirmed (current: ${plan.status})` },
        { status: 400 }
      );
    }

    const [updated] = await query(
      `UPDATE chapter_plans
       SET status = 'confirmed', updated_at = NOW()
       WHERE id = $1 AND novel_id = $2
       RETURNING *`,
      [planId, id]
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to confirm chapter plan:', error);
    return NextResponse.json({ error: 'Failed to confirm chapter plan' }, { status: 500 });
  }
}

