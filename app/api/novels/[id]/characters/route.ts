import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireApiNovelOwner } from '@/lib/auth/api';
import { Character } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const characters = await query<Character>(
      'SELECT * FROM characters WHERE novel_id = $1 ORDER BY first_appearance',
      [id]
    );
    return NextResponse.json(characters);
  } catch (error) {
    console.error('Failed to fetch characters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch characters' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const body = await request.json();
    const { name, description, personality, abilities, status, first_appearance, last_appearance } = body;

    const [character] = await query<Character>(
      `INSERT INTO characters (novel_id, name, description, personality, abilities, status, first_appearance, last_appearance)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, name, description, personality, abilities, status, first_appearance, last_appearance]
    );

    return NextResponse.json(character, { status: 201 });
  } catch (error) {
    console.error('Failed to create character:', error);
    return NextResponse.json(
      { error: 'Failed to create character' },
      { status: 500 }
    );
  }
}
