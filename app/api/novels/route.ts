import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireApiUser } from '@/lib/auth/api';
import { Novel } from '@/lib/types';

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
    const body = await request.json();
    const { title, description, genre } = body;

    const [novel] = await query<Novel>(
      `INSERT INTO novels (user_id, title, description, genre)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user.id, title, description, genre]
    );

    return NextResponse.json(novel, { status: 201 });
  } catch (error) {
    console.error('Failed to create novel:', error);
    return NextResponse.json(
      { error: 'Failed to create novel' },
      { status: 500 }
    );
  }
}
