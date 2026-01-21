import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Novel, WorldSetting } from '@/lib/types';

async function getNovel(id: string): Promise<Novel | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/novels/${id}`, {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    return null;
  }
}

async function getWorldSettings(novelId: string): Promise<WorldSetting[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/novels/${novelId}/world-settings`, {
      cache: 'no-store'
    });
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    return [];
  }
}

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const novel = await getNovel(id);

  if (!novel) {
    notFound();
  }

  const settings = await getWorldSettings(id);
  const categories = {
    rule: '规则',
    geography: '地理',
    history: '历史',
    magic: '魔法',
  };

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
            世界观设定
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {novel.title} - 共 {settings.length} 个设定
          </p>
        </header>

        <div className="space-y-4">
          {settings.map((setting) => (
            <div
              key={setting.id}
              className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6 hover:border-amber-700 dark:hover:border-amber-500 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-amber-50">
                  {setting.title}
                </h2>
                <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 text-sm font-medium border border-amber-300 dark:border-amber-700 whitespace-nowrap ml-4">
                  {categories[setting.category]}
                </span>
              </div>

              <p className="text-gray-800 dark:text-gray-200 mb-4 leading-relaxed">
                {setting.content}
              </p>

              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500 font-mono">
                <span>相关章节:</span>
                {setting.relatedChapters.map((chapter, index) => (
                  <span key={index}>
                    第 {chapter} 章{index < setting.relatedChapters.length - 1 ? ',' : ''}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
