import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { Character } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { characterId } = await params;
    const character = await queryOne<Character>(
      'SELECT * FROM characters WHERE id = $1',
      [characterId]
    );

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(character);
  } catch (error) {
    console.error('Failed to fetch character:', error);
    return NextResponse.json(
      { error: 'Failed to fetch character' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { characterId } = await params;
    const body = await request.json();
    const { name, description, personality, abilities, status, first_appearance, last_appearance } = body;

    const [character] = await query<Character>(
      `UPDATE characters
       SET name = $1, description = $2, personality = $3, abilities = $4, status = $5,
           first_appearance = $6, last_appearance = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [name, description, personality, abilities, status, first_appearance, last_appearance, characterId]
    );

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(character);
  } catch (error) {
    console.error('Failed to update character:', error);
    return NextResponse.json(
      { error: 'Failed to update character' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { characterId } = await params;
    await query('DELETE FROM characters WHERE id = $1', [characterId]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete character:', error);
    return NextResponse.json(
      { error: 'Failed to delete character' },
      { status: 500 }
    );
  }
}
