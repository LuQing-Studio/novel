import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { Novel, Chapter } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 获取小说信息
    const novel = await queryOne<Novel>('SELECT * FROM novels WHERE id = $1', [id]);
    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    // 获取所有章节
    const chapters = await query<Chapter>(
      'SELECT * FROM chapters WHERE novel_id = $1 ORDER BY number',
      [id]
    );

    // 构建 TXT 内容
    let txtContent = '';

    // 添加标题和简介
    txtContent += `${novel.title}\n`;
    txtContent += `${'='.repeat(novel.title.length)}\n\n`;
    txtContent += `类型: ${novel.genre}\n`;
    txtContent += `简介: ${novel.description}\n`;
    txtContent += `章节数: ${chapters.length}\n`;
    txtContent += `\n${'='.repeat(50)}\n\n`;

    // 添加所有章节
    chapters.forEach((chapter, index) => {
      txtContent += `\n\n${chapter.title}\n`;
      txtContent += `${'-'.repeat(chapter.title.length)}\n\n`;
      txtContent += `${chapter.content}\n`;

      if (index < chapters.length - 1) {
        txtContent += `\n${'='.repeat(50)}\n`;
      }
    });

    // 返回文件
    return new NextResponse(txtContent, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(novel.title)}.txt"`,
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
