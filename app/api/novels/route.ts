import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Novel } from '@/lib/types';

export async function GET() {
  try {
    const novels = await query<Novel>(
      'SELECT * FROM novels ORDER BY created_at DESC'
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
    const body = await request.json();
    const { title, description, genre } = body;

    const [novel] = await query<Novel>(
      `INSERT INTO novels (title, description, genre)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [title, description, genre]
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
