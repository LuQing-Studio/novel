import Link from 'next/link';
import { notFound } from 'next/navigation';
import { mockNovels, mockChapters } from '@/lib/data/mock';
import { ThemeToggle } from '@/components/ThemeToggle';

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ id: string; chapterId: string }>;
}) {
  const { id, chapterId } = await params;
  const novel = mockNovels.find(n => n.id === id);
  const chapter = mockChapters.find(c => c.id === chapterId);

  if (!novel || !chapter) {
    notFound();
  }

  const chapters = mockChapters.filter(c => c.novelId === id);
  const currentIndex = chapters.findIndex(c => c.id === chapterId);
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#1a1816] transition-colors relative">
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiAvPjwvc3ZnPg==')]" />

      <ThemeToggle />

      <div className="container mx-auto px-4 py-8 max-w-3xl relative">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href={`/novels/${id}`}
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-amber-700 dark:hover:text-amber-500 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回目录
          </Link>

          <div className="text-sm text-gray-500 dark:text-gray-500 font-mono">
            {chapter.number} / {chapters.length}
          </div>
        </div>

        {/* Chapter Content */}
        <article className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-8 md:p-12 mb-8">
          {/* Chapter Header */}
          <header className="mb-8 pb-6 border-b-2 border-amber-700/20 dark:border-amber-500/20">
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 dark:text-amber-50 mb-2">
              {chapter.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500 font-mono">
              <span>{chapter.wordCount} 字</span>
              <span>{chapter.createdAt.toLocaleDateString('zh-CN')}</span>
            </div>
          </header>

          {/* Chapter Text */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <div className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap font-serif text-lg">
              {chapter.content}
            </div>
          </div>
        </article>

        {/* Chapter Navigation */}
        <div className="flex items-center justify-between gap-4">
          {prevChapter ? (
            <Link
              href={`/novels/${id}/chapters/${prevChapter.id}`}
              className="flex-1 p-4 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 hover:border-amber-700 dark:hover:border-amber-500 transition-all group"
            >
              <div className="text-sm text-gray-500 dark:text-gray-500 mb-1">上一章</div>
              <div className="font-medium text-gray-900 dark:text-amber-50 group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors line-clamp-1">
                {prevChapter.title}
              </div>
            </Link>
          ) : (
            <div className="flex-1 p-4 bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 opacity-50">
              <div className="text-sm text-gray-400 dark:text-gray-600">已是第一章</div>
            </div>
          )}

          {nextChapter ? (
            <Link
              href={`/novels/${id}/chapters/${nextChapter.id}`}
              className="flex-1 p-4 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 hover:border-amber-700 dark:hover:border-amber-500 transition-all group text-right"
            >
              <div className="text-sm text-gray-500 dark:text-gray-500 mb-1">下一章</div>
              <div className="font-medium text-gray-900 dark:text-amber-50 group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors line-clamp-1">
                {nextChapter.title}
              </div>
            </Link>
          ) : (
            <div className="flex-1 p-4 bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 opacity-50 text-right">
              <div className="text-sm text-gray-400 dark:text-gray-600">已是最后一章</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
