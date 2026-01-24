import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireApiNovel } from '@/lib/auth/api';
import { Chapter } from '@/lib/types';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function safeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const auth = await requireApiNovel(id);
    if ('response' in auth) return auth.response;

    const { novel } = auth;

    const url = new URL(request.url);
    const chapterIdsFromCsv = (url.searchParams.get('chapterIds') || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    const chapterIdsFromMulti = url.searchParams.getAll('chapterId').map((x) => x.trim()).filter(Boolean);

    const chapterIds = Array.from(
      new Set([...chapterIdsFromCsv, ...chapterIdsFromMulti].filter(isUuid))
    );

    // 获取章节（支持按 id 选择导出）
    const chapters = chapterIds.length
      ? await query<Pick<Chapter, 'id' | 'number' | 'title' | 'content'>>(
          'SELECT id, number, title, content FROM chapters WHERE novel_id = $1 AND id = ANY($2::uuid[]) ORDER BY number',
          [id, chapterIds]
        )
      : await query<Pick<Chapter, 'id' | 'number' | 'title' | 'content'>>(
          'SELECT id, number, title, content FROM chapters WHERE novel_id = $1 ORDER BY number',
          [id]
        );

    // 构建 TXT 内容
    let txtContent = '';

    const exportingSelected = chapterIds.length > 0;
    const exportCount = chapters.length;

    if (exportCount === 0) {
      return NextResponse.json({ error: 'No chapters to export' }, { status: 404 });
    }

    if (exportingSelected && exportCount === 1) {
      const [chapter] = chapters;
      txtContent += `${chapter.title}\n`;
      txtContent += `${'-'.repeat(chapter.title.length)}\n\n`;
      txtContent += `${chapter.content}\n`;
    } else {
      // 添加标题和简介
      txtContent += `${novel.title}${exportingSelected ? '（选中章节导出）' : ''}\n`;
      txtContent += `${'='.repeat(novel.title.length + (exportingSelected ? 8 : 0))}\n\n`;
      txtContent += `类型: ${novel.genre}\n`;
      txtContent += `简介: ${novel.description}\n`;
      txtContent += `章节数: ${exportCount}\n`;
      txtContent += `\n${'='.repeat(50)}\n\n`;

      // 添加章节
      chapters.forEach((chapter, index) => {
        txtContent += `\n\n${chapter.title}\n`;
        txtContent += `${'-'.repeat(chapter.title.length)}\n\n`;
        txtContent += `${chapter.content}\n`;

        if (index < chapters.length - 1) {
          txtContent += `\n${'='.repeat(50)}\n`;
        }
      });
    }

    const baseName = safeFilenamePart(novel.title) || 'novel';
    const filename =
      exportingSelected && exportCount === 1
        ? `${baseName}-${safeFilenamePart(chapters[0].title) || 'chapter'}.txt`
        : exportingSelected
          ? `${baseName}-selected.txt`
          : `${baseName}.txt`;

    // 返回文件
    return new NextResponse(txtContent, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error('Failed to export novel:', error);
    return NextResponse.json(
      { error: 'Failed to export novel' },
      { status: 500 }
    );
  }
}
