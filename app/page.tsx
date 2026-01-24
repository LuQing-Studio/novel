import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getCurrentUser } from '@/lib/auth/session';
import { apiFetch } from '@/lib/server/api-fetch';
import { Novel } from '@/lib/types';

async function getNovels(): Promise<Novel[]> {
  try {
    const res = await apiFetch('/api/novels', { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error('Failed to fetch novels:', error);
    return [];
  }
}

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const novels = await getNovels();
  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#1a1816] transition-colors relative">
      {/* Paper texture overlay */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiAvPjwvc3ZnPg==')]" />

      <ThemeToggle />

      <div className="container mx-auto px-4 py-12 max-w-6xl relative">
        {/* Header */}
        <header className="mb-16 border-b-2 border-amber-700/20 dark:border-amber-500/20 pb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <h1 className="text-6xl md:text-7xl font-serif font-bold text-gray-900 dark:text-amber-50 mb-3 tracking-tight">
                Novel.AI
              </h1>
              <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 font-light max-w-2xl">
                AI 驱动的小说创作工坊 — 保持长期一致性的智能写作工具
              </p>
            </div>

            <div className="md:text-right">
              <div className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                {user.email}
              </div>
              <form action="/api/auth/logout" method="post" className="mt-3 inline-block">
                <button
                  type="submit"
                  className="px-4 py-2 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:border-amber-700 dark:hover:border-amber-500 transition-all"
                >
                  退出登录
                </button>
              </form>
            </div>
          </div>
        </header>

        {/* Novel List Section */}
        <div className="mb-16">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <h2 className="text-3xl font-serif font-semibold text-gray-900 dark:text-amber-50 border-l-4 border-amber-700 dark:border-amber-500 pl-4">
              我的小说
            </h2>
            <Link
              href="/novels/new"
              className="px-6 py-3 bg-amber-700 dark:bg-amber-600 text-white font-medium border-2 border-amber-900 dark:border-amber-700 hover:bg-amber-800 dark:hover:bg-amber-700 transition-all shadow-md hover:shadow-lg"
            >
              + 创建新小说
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {novels.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                暂无小说，点击“创建新小说”开始创作
              </div>
            ) : (
              novels.map((novel) => (
              <Link
                key={novel.id}
                href={`/novels/${novel.id}`}
                className="block group"
              >
                <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 hover:border-amber-700 dark:hover:border-amber-500 transition-all p-6 relative overflow-hidden">
                  {/* Corner decoration */}
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-amber-700/30 dark:border-amber-500/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-amber-700/30 dark:border-amber-500/30 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-amber-50 line-clamp-2 flex-1">
                      {novel.title}
                    </h3>
                    <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 text-sm font-medium border border-amber-300 dark:border-amber-700 ml-2">
                      {novel.genre}
                    </span>
                  </div>

                  <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3 text-sm leading-relaxed">
                    {novel.description}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-500 border-t border-gray-200 dark:border-gray-800 pt-4">
                    <div className="flex items-center gap-4">
                      <span className="font-mono">{novel.chapterCount || 0} 章</span>
                      <span className="font-mono">{((novel.wordCount || 0) / 10000).toFixed(1)}万字</span>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-gray-400 dark:text-gray-600 font-mono">
                    {new Date(novel.updatedAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              </Link>
              ))
            )}
          </div>
        </div>

        {/* Features Section */}
        <div className="grid gap-6 md:grid-cols-3 border-t-2 border-amber-700/20 dark:border-amber-500/20 pt-12">
          <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6">
            <div className="text-4xl mb-4">🧠</div>
            <h3 className="text-lg font-serif font-semibold text-gray-900 dark:text-amber-50 mb-2">
              记忆系统
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              自动跟踪人物、伏笔、世界观,确保长篇小说的一致性
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6">
            <div className="text-4xl mb-4">✍️</div>
            <h3 className="text-lg font-serif font-semibold text-gray-900 dark:text-amber-50 mb-2">
              分章节生成
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              每次生成一章,质量可控,可以逐章审核和调整
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-serif font-semibold text-gray-900 dark:text-amber-50 mb-2">
              毒舌编辑
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              AI 编辑检查一致性,指出矛盾和问题,提供修改建议
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
