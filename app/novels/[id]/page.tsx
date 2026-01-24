import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GenerateChapterButton } from '@/components/GenerateChapterButton';
import { ExportButton } from '@/components/ExportButton';
import { getCurrentUser } from '@/lib/auth/session';
import { apiFetch } from '@/lib/server/api-fetch';
import { Novel, Chapter } from '@/lib/types';

async function getNovel(id: string): Promise<Novel | null> {
  try {
    const res = await apiFetch(`/api/novels/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getChapters(novelId: string): Promise<Chapter[]> {
  try {
    const res = await apiFetch(`/api/novels/${novelId}/chapters`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function NovelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const { id } = await params;
  const novel = await getNovel(id);

  if (!novel) {
    notFound();
  }

  const chapters = await getChapters(id);

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#1a1816] transition-colors relative">
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiAvPjwvc3ZnPg==')]" />

      <ThemeToggle />

      <div className="container mx-auto px-4 py-8 max-w-4xl relative">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-amber-700 dark:hover:text-amber-500 mb-8 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回首页
        </Link>

        {/* Novel Header */}
        <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-8 mb-8">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-4xl font-serif font-bold text-gray-900 dark:text-amber-50">
              {novel.title}
            </h1>
            <div className="flex items-center gap-3">
              <ExportButton novelId={id} />
              <Link
                href={`/novels/${id}/knowledge-graph`}
                className="px-4 py-2 bg-purple-700 dark:bg-purple-600 text-white font-medium hover:bg-purple-800 dark:hover:bg-purple-700 transition-colors"
              >
                知识图谱
              </Link>
              <Link
                href={`/novels/${id}/memory`}
                className="px-4 py-2 bg-amber-700 dark:bg-amber-600 text-white font-medium hover:bg-amber-800 dark:hover:bg-amber-700 transition-colors"
              >
                记忆系统
              </Link>
              <span className="px-4 py-2 bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 font-medium border border-amber-300 dark:border-amber-700">
                {novel.genre}
              </span>
            </div>
          </div>

          <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
            {novel.description}
          </p>

          <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800 pt-4">
            <span className="font-mono">{novel.chapterCount || 0} 章</span>
            <span className="font-mono">{((novel.wordCount || 0) / 10000).toFixed(1)} 万字</span>
            <span className="font-mono">更新于 {new Date(novel.updatedAt).toLocaleDateString('zh-CN')}</span>
          </div>
        </div>

        {/* Chapter List */}
        <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 dark:text-amber-50 mb-6 border-l-4 border-amber-700 dark:border-amber-500 pl-4">
            章节列表
          </h2>

          <div className="mb-6">
            <GenerateChapterButton novelId={id} />
          </div>

          <div className="space-y-2">
            {chapters.map((chapter) => (
              <Link
                key={chapter.id}
                href={`/novels/${id}/chapters/${chapter.id}`}
                className="block p-4 border border-gray-200 dark:border-gray-800 hover:border-amber-700 dark:hover:border-amber-500 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-amber-50 group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors">
                      {chapter.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      {chapter.outline}
                    </p>
                  </div>
                  <div className="text-sm text-gray-400 dark:text-gray-600 font-mono ml-4">
                    {chapter.wordCount} 字
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
