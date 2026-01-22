import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Novel, Foreshadowing } from '@/lib/types';

async function getNovel(id: string): Promise<Novel | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/novels/${id}`, {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getForeshadowing(novelId: string): Promise<Foreshadowing[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/novels/${novelId}/foreshadowing`, {
      cache: 'no-store'
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function ForeshadowingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const novel = await getNovel(id);

  if (!novel) {
    notFound();
  }

  const foreshadowing = await getForeshadowing(id);

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#1a1816] transition-colors relative">
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiAvPjwvc3ZnPg==')]" />

      <ThemeToggle />

      <div className="container mx-auto px-4 py-8 max-w-5xl relative">
        <Link
          href={`/novels/${id}/memory`}
          className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-amber-700 dark:hover:text-amber-500 mb-8 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回记忆系统
        </Link>

        <header className="mb-8 border-b-2 border-amber-700/20 dark:border-amber-500/20 pb-6">
          <h1 className="text-4xl font-serif font-bold text-gray-900 dark:text-amber-50 mb-2">
            伏笔列表
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {novel.title} - 共 {foreshadowing.length} 个伏笔
          </p>
        </header>

        <div className="space-y-4">
          {foreshadowing.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6 hover:border-amber-700 dark:hover:border-amber-500 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <p className="text-lg text-gray-800 dark:text-gray-200 mb-3">
                    {item.content}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500 font-mono">
                    <span>埋下: 第 {item.plantedChapter} 章</span>
                    <span>→</span>
                    <span>计划揭示: 第 {item.plannedRevealChapter} 章</span>
                    {item.revealed && item.revealedChapter && (
                      <>
                        <span>→</span>
                        <span className="text-green-600 dark:text-green-400">
                          已揭示: 第 {item.revealedChapter} 章
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`px-3 py-1 text-sm font-medium border whitespace-nowrap ml-4 ${
                  item.revealed
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
                    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700'
                }`}>
                  {item.revealed ? '已揭示' : '待揭示'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
