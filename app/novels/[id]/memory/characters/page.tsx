import Link from 'next/link';
import { notFound } from 'next/navigation';
import { mockNovels, mockCharacters } from '@/lib/data/mock';
import { ThemeToggle } from '@/components/ThemeToggle';

export default async function CharactersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const novel = mockNovels.find(n => n.id === id);

  if (!novel) {
    notFound();
  }

  const characters = mockCharacters.filter(c => c.novelId === id);

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
            人物卡
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {novel.title} - 共 {characters.length} 个人物
          </p>
        </header>

        <div className="space-y-4">
          {characters.map((character) => (
            <div
              key={character.id}
              className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6 hover:border-amber-700 dark:hover:border-amber-500 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-amber-50 mb-1">
                    {character.name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-500 font-mono">
                    首次出现: 第 {character.firstAppearance} 章 | 最后出现: 第 {character.lastAppearance} 章
                  </p>
                </div>
                <span className={`px-3 py-1 text-sm font-medium border ${
                  character.status === 'alive'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
                    : character.status === 'dead'
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-700'
                }`}>
                  {character.status === 'alive' ? '存活' : character.status === 'dead' ? '死亡' : '未知'}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">描述</h3>
                  <p className="text-gray-800 dark:text-gray-200">{character.description}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">性格</h3>
                  <p className="text-gray-800 dark:text-gray-200">{character.personality}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">能力</h3>
                  <div className="flex flex-wrap gap-2">
                    {character.abilities.map((ability, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 text-sm border border-amber-300 dark:border-amber-700"
                      >
                        {ability}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
