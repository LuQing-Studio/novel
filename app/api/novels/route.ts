import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireApiUser } from '@/lib/auth/api';
import { Novel } from '@/lib/types';

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export async function GET() {
  try {
    const auth = await requireApiUser();
    if ('response' in auth) return auth.response;

    const { user } = auth;
    const novels = await query<Novel>(
      'SELECT * FROM novels WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );
    return NextResponse.json(novels);
  } catch (error) {
    console.error('Failed to fetch novels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch novels' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser();
    if ('response' in auth) return auth.response;

    const { user } = auth;
    const body = (await request.json()) as Record<string, unknown>;
    const title = safeString(body.title).trim();
    const description = safeString(body.description).trim();
    const genre = safeString(body.genre).trim();
    const idea = safeString(body.idea).trim();
    const overallOutline = safeString(body.overall_outline ?? body.overallOutline).trim();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!genre) {
      return NextResponse.json({ error: 'Genre is required' }, { status: 400 });
    }
    if (!idea) {
      return NextResponse.json({ error: 'Idea is required' }, { status: 400 });
    }

    const [novel] = await query<Novel>(
      `INSERT INTO novels (user_id, title, idea, description, genre, overall_outline)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user.id, title, idea, description, genre, overallOutline]
    );

    // Create default 5 volumes for InkFlow v2 (Book -> 5 volumes)
    try {
      for (let i = 1; i <= 5; i += 1) {
        await query(
          `INSERT INTO volumes (novel_id, number, title, outline)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (novel_id, number) DO NOTHING`,
          [novel.id, i, `卷${i}`, '']
        );
      }
    } catch (error) {
      // Backward compatibility: older DB without volumes table.
      console.warn('Failed to create default volumes:', error);
    }

    return NextResponse.json(novel, { status: 201 });
  } catch (error) {
    console.error('Failed to create novel:', error);
    return NextResponse.json(
      { error: 'Failed to create novel' },
      { status: 500 }
    );
  }
}
