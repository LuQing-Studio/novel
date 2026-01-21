import Link from 'next/link';
import { notFound } from 'next/navigation';
import { mockNovels, mockCharacters, mockForeshadowing, mockWorldSettings } from '@/lib/data/mock';
import { ThemeToggle } from '@/components/ThemeToggle';

export default async function MemoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const novel = mockNovels.find(n => n.id === id);

  if (!novel) {
    notFound();
  }

  const characters = mockCharacters.filter(c => c.novelId === id);
  const foreshadowing = mockForeshadowing.filter(f => f.novelId === id);
  const settings = mockWorldSettings.filter(s => s.novelId === id);

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#1a1816] transition-colors relative">
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiAvPjwvc3ZnPg==')]" />

      <ThemeToggle />

      <div className="container mx-auto px-4 py-8 max-w-6xl relative">
        <Link
          href={`/novels/${id}`}
          className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-amber-700 dark:hover:text-amber-500 mb-8 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回小说详情
        </Link>

        <header className="mb-12">
          <h1 className="text-5xl font-serif font-bold text-gray-900 dark:text-amber-50 mb-3">
            记忆系统
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {novel.title} - 人物、伏笔、世界观设定
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href={`/novels/${id}/memory/characters`}
            className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-8 hover:border-amber-700 dark:hover:border-amber-500 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-amber-50 group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors">
                人物卡
              </h2>
              <div className="text-3xl font-bold text-amber-700 dark:text-amber-500">
                {characters.length}
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              管理小说中的所有人物,记录性格、能力、状态
            </p>
            <div className="flex items-center text-amber-700 dark:text-amber-500 font-medium">
              查看详情
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href={`/novels/${id}/memory/foreshadowing`}
            className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-8 hover:border-amber-700 dark:hover:border-amber-500 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-amber-50 group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors">
                伏笔列表
              </h2>
              <div className="text-3xl font-bold text-amber-700 dark:text-amber-500">
                {foreshadowing.length}
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              追踪埋下的伏笔,确保后续章节回收
            </p>
            <div className="flex items-center text-amber-700 dark:text-amber-500 font-medium">
              查看详情
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href={`/novels/${id}/memory/settings`}
            className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-8 hover:border-amber-700 dark:hover:border-amber-500 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-amber-50 group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors">
                世界观设定
              </h2>
              <div className="text-3xl font-bold text-amber-700 dark:text-amber-500">
                {settings.length}
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              维护世界规则、地理、历史等设定
            </p>
            <div className="flex items-center text-amber-700 dark:text-amber-500 font-medium">
              查看详情
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
