'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

interface Character {
  name: string;
  description: string;
  status: 'alive' | 'dead' | 'unknown';
}

interface WorldSetting {
  category: 'rule' | 'geography' | 'history' | 'magic';
  content: string;
}

interface Foreshadowing {
  content: string;
  plannedRevealChapter: number;
}

interface Setup {
  characters: Character[];
  worldSettings: WorldSetting[];
  foreshadowing: Foreshadowing[];
}

export default function NewNovelPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generatingSetup, setGeneratingSetup] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    genre: '玄幻',
  });
  const [setup, setSetup] = useState<Setup | null>(null);

  const handleGenerateSetup = async () => {
    if (!formData.title || !formData.description) {
      alert('请先填写标题和简介');
      return;
    }

    setGeneratingSetup(true);
    try {
      const res = await fetch('/api/novels/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        setSetup(data);
      }
    } catch (error) {
      console.error('Failed to generate setup:', error);
    } finally {
      setGeneratingSetup(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const novelRes = await fetch('/api/novels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (novelRes.ok) {
        const novel = await novelRes.json();

        if (setup) {
          for (const char of setup.characters) {
            await fetch(`/api/novels/${novel.id}/characters`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: char.name,
                description: char.description,
                status: char.status,
              }),
            });
          }

          for (const setting of setup.worldSettings) {
            await fetch(`/api/novels/${novel.id}/world-settings`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                category: setting.category,
                title: setting.category === 'rule' ? '规则设定' :
                       setting.category === 'geography' ? '地理设定' :
                       setting.category === 'history' ? '历史设定' : '魔法设定',
                content: setting.content,
              }),
            });
          }

          for (const foreshadow of setup.foreshadowing) {
            await fetch(`/api/novels/${novel.id}/foreshadowing`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: foreshadow.content,
                planted_chapter: 1,
                planned_reveal_chapter: foreshadow.plannedRevealChapter,
                revealed: false,
              }),
            });
          }
        }

        router.push(`/novels/${novel.id}`);
      }
    } catch (error) {
      console.error('Failed to create novel:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#1a1816] transition-colors relative">
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiAvPjwvc3ZnPg==')]" />

      <ThemeToggle />

      <div className="container mx-auto px-4 py-8 max-w-2xl relative">
        <Link
          href="/"
          className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-amber-700 dark:hover:text-amber-500 mb-8 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回首页
        </Link>

        <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-8">
          <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-amber-50 mb-6 border-b-2 border-amber-700/20 dark:border-amber-500/20 pb-4">
            创建新小说
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                小说标题 *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-amber-700 dark:focus:border-amber-500 outline-none transition-colors"
                placeholder="例如:修仙世界的程序员"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                类型 *
              </label>
              <select
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-amber-700 dark:focus:border-amber-500 outline-none transition-colors"
              >
                <option value="玄幻">玄幻</option>
                <option value="都市">都市</option>
                <option value="科幻">科幻</option>
                <option value="武侠">武侠</option>
                <option value="历史">历史</option>
                <option value="游戏">游戏</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                简介 *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-amber-700 dark:focus:border-amber-500 outline-none transition-colors resize-none"
                placeholder="简要描述你的小说故事..."
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={handleGenerateSetup}
                disabled={generatingSetup || !formData.title || !formData.description}
                className="flex-1 px-6 py-3 bg-purple-700 dark:bg-purple-600 text-white font-medium hover:bg-purple-800 dark:hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {generatingSetup ? 'AI 生成中...' : '✨ AI 助手完善设定'}
              </button>
            </div>

            {setup && (
              <div className="mt-6 p-6 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700">
                <h3 className="text-lg font-serif font-semibold text-gray-900 dark:text-amber-50 mb-4">
                  AI 生成的设定
                </h3>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-amber-50 mb-2">主要人物:</h4>
                    <div className="space-y-2">
                      {setup.characters.map((char, i) => (
                        <div key={i} className="p-3 bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 dark:text-amber-50">{char.name}</span>
                            <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                              {char.status === 'alive' ? '存活' : char.status === 'dead' ? '死亡' : '未知'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{char.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-amber-50 mb-2">世界观设定:</h4>
                    <div className="space-y-2">
                      {setup.worldSettings.map((setting, i) => (
                        <div key={i} className="p-3 bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800">
                          <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                            {setting.category === 'rule' ? '规则' : setting.category === 'geography' ? '地理' : setting.category === 'history' ? '历史' : '魔法'}
                          </span>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{setting.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-amber-50 mb-2">初始伏笔:</h4>
                    <div className="space-y-2">
                      {setup.foreshadowing.map((foreshadow, i) => (
                        <div key={i} className="p-3 bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800">
                          <p className="text-sm text-gray-700 dark:text-gray-300">{foreshadow.content}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            计划第 {foreshadow.plannedRevealChapter} 章揭示
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-amber-700 dark:bg-amber-600 text-white font-medium hover:bg-amber-800 dark:hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {loading ? '创建中...' : '创建小说'}
              </button>
              <Link
                href="/"
                className="px-6 py-3 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:border-amber-700 dark:hover:border-amber-500 transition-colors text-center"
              >
                取消
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
