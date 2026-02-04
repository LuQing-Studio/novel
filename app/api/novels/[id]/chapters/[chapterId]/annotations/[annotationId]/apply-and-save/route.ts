import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireApiNovelOwner } from '@/lib/auth/api';
import { countWords } from '@/lib/utils/text';

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function findBestRange(content: string, quote: string, preferredStart: number): { start: number; end: number } | null {
  if (!quote) return null;

  const positions: number[] = [];
  let idx = content.indexOf(quote);
  while (idx !== -1) {
    positions.push(idx);
    idx = content.indexOf(quote, idx + 1);
  }

  if (positions.length === 1) {
    const start = positions[0];
    return { start, end: start + quote.length };
  }

  if (positions.length > 1) {
    let best = positions[0];
    let bestDist = Math.abs(best - preferredStart);
    for (const p of positions) {
      const dist = Math.abs(p - preferredStart);
      if (dist < bestDist) {
        best = p;
        bestDist = dist;
      }
    }
    return { start: best, end: best + quote.length };
  }

  return null;
}

async function nextChapterVersionNumber(chapterId: string): Promise<number> {
  const row = await queryOne<{ maxVersion: number }>(
    'SELECT COALESCE(MAX(version_number), 0) as max_version FROM chapter_versions WHERE chapter_id = $1',
    [chapterId]
  );
  return (row?.maxVersion ?? 0) + 1;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string; annotationId: string }> }
) {
  try {
    const { id, chapterId, annotationId } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    const chapter = await queryOne<{ id: string; content: string; wordCount: number }>(
      'SELECT id, content, word_count FROM chapters WHERE id = $1 AND novel_id = $2',
      [chapterId, id]
    );
    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const annotation = await queryOne<{
      id: string;
      chapterId: string;
      status: string;
      quote: string;
      startOffset: number;
      endOffset: number;
      comment: string;
    }>(
      'SELECT * FROM chapter_annotations WHERE id = $1 AND chapter_id = $2',
      [annotationId, chapterId]
    );
    if (!annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
    }
    if (annotation.status !== 'open') {
      return NextResponse.json({ error: `Annotation is not open (current: ${annotation.status})` }, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const replacement = safeString(body.replacement).trim();
    if (!replacement) {
      return NextResponse.json({ error: 'replacement is required' }, { status: 400 });
    }

    const range =
      findBestRange(chapter.content, annotation.quote, annotation.startOffset) ??
      (annotation.startOffset >= 0 &&
      annotation.endOffset <= chapter.content.length &&
      annotation.endOffset > annotation.startOffset
        ? { start: annotation.startOffset, end: annotation.endOffset }
        : null);

    if (!range) {
      return NextResponse.json({ error: 'Failed to locate annotated text in current chapter' }, { status: 409 });
    }

    const previousContent = chapter.content;
    const nextContent = previousContent.slice(0, range.start) + replacement + previousContent.slice(range.end);

    // Save previous chapter version
    const nextVersion = await nextChapterVersionNumber(chapterId);
    await query(
      `INSERT INTO chapter_versions (chapter_id, version_number, content, word_count, created_by, change_description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        chapterId,
        nextVersion,
        previousContent,
        chapter.wordCount ?? countWords(previousContent),
        'user',
        `批注应用前版本：${annotation.comment}`.slice(0, 200),
      ]
    );

    const nextWordCount = countWords(nextContent);
    const [updatedChapter] = await query(
      `UPDATE chapters
       SET content = $1, word_count = $2
       WHERE id = $3 AND novel_id = $4
       RETURNING *`,
      [nextContent, nextWordCount, chapterId, id]
    );

    await query(
      `UPDATE chapter_annotations
       SET status = 'applied', updated_at = NOW()
       WHERE id = $1 AND chapter_id = $2`,
      [annotationId, chapterId]
    );

    // Sync novel stats
    await query(
      `UPDATE novels
       SET word_count = COALESCE((SELECT SUM(word_count) FROM chapters WHERE novel_id = $1), 0),
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    return NextResponse.json({ chapter: updatedChapter });
  } catch (error) {
    console.error('Failed to apply-and-save annotation:', error);
    return NextResponse.json({ error: 'Failed to apply-and-save annotation' }, { status: 500 });
  }
}

