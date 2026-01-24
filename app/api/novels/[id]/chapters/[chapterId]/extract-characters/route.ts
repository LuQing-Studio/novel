import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { Chapter } from '@/lib/types';
import { requireApiNovelOwner } from '@/lib/auth/api';
import { extractCharactersFromChapter, addExtractedCharacters } from '@/lib/ai/character-extractor';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { id, chapterId } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const body = await request.json();
    const { autoAdd = false } = body;

    const chapter = await queryOne<Chapter>(
      'SELECT * FROM chapters WHERE id = $1 AND novel_id = $2',
      [chapterId, id]
    );

    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const characters = await extractCharactersFromChapter(
      id,
      chapterId,
      chapter.number,
      chapter.content
    );

    if (autoAdd) {
      await addExtractedCharacters(id, chapter.number, characters);
    }

    return NextResponse.json({ characters });
  } catch (error) {
    console.error('Failed to extract characters:', error);
    return NextResponse.json(
      { error: 'Failed to extract characters' },
      { status: 500 }
    );
  }
}
