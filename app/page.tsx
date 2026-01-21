import Link from 'next/link';
import { mockNovels } from '@/lib/data/mock';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            📖 Novel AI
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            AI 驱动的小说创作助手 - 保持长期一致性的智能写作工具
          </p>
        </header>

        {/* Novel List */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
              我的小说
            </h2>
            <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-lg">
              + 创建新小说
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mockNovels.map((novel) => (
              <Link
                key={novel.id}
                href={`/novels/${novel.id}`}
                className="block"
              >
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all p-6 border border-gray-200 dark:border-gray-700 hover:scale-105">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-2">
                      {novel.title}
                    </h3>
                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm font-medium">
                      {novel.genre}
                    </span>
                  </div>

                  <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                    {novel.description}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-4">
                      <span>📝 {novel.chapterCount} 章</span>
                      <span>✍️ {(novel.wordCount / 10000).toFixed(1)}万字</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      更新于 {novel.updatedAt.toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="text-4xl mb-4">🧠</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              记忆系统
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              自动跟踪人物、伏笔、世界观,确保长篇小说的一致性
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="text-4xl mb-4">✍️</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              分章节生成
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              每次生成一章,质量可控,可以逐章审核和调整
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              毒舌编辑
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              AI 编辑检查一致性,指出矛盾和问题,提供修改建议
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
