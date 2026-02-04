'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';

interface NovelBlueprint {
  title: string;
  description: string;
  overall_outline: string;
}

type Step = 'idea' | 'choose';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

export default function NewNovelPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [step, setStep] = useState<Step>('idea');

  const [idea, setIdea] = useState('');
  const [genre, setGenre] = useState('玄幻');
  const [workingTitle, setWorkingTitle] = useState('');

  const [loadingBlueprints, setLoadingBlueprints] = useState(false);
  const [blueprints, setBlueprints] = useState<NovelBlueprint[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => {
    return blueprints[selectedIndex] || null;
  }, [blueprints, selectedIndex]);

  const [finalForm, setFinalForm] = useState({
    title: '',
    description: '',
    overallOutline: '',
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          setCheckingAuth(false);
          return;
        }
      } catch {
        // ignore
      }
      router.replace('/login');
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!selected) return;
    setFinalForm({
      title: selected.title,
      description: selected.description,
      overallOutline: selected.overall_outline,
    });
  }, [selected?.title]); // eslint-disable-line react-hooks/exhaustive-deps

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#faf8f5] dark:bg-[#1a1816] transition-colors relative">
        <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiAvPjwvc3ZnPg==')]" />
        <ThemeToggle />
        <div className="container mx-auto px-4 py-12 max-w-2xl relative text-gray-600 dark:text-gray-400">
          正在检查登录状态...
        </div>
      </div>
    );
  }

  const handleGenerateBlueprints = async () => {
    setError(null);
    if (!idea.trim()) {
      setError('请先填写一句话灵感（idea）');
      return;
    }

    setLoadingBlueprints(true);
    try {
      const res = await fetch('/api/novels/blueprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea: idea.trim(),
          genre,
          count: 3,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || '生成总纲候选失败');
      }

      const list = Array.isArray(data?.blueprints) ? (data.blueprints as NovelBlueprint[]) : [];
      if (list.length === 0) {
        throw new Error('总纲候选为空');
      }

      setBlueprints(list);
      setSelectedIndex(0);
      setStep('choose');
    } catch (e) {
      setError(getErrorMessage(e) || '生成失败');
    } finally {
      setLoadingBlueprints(false);
    }
  };

  const handleCreateNovel = async () => {
    setError(null);
    const title = finalForm.title.trim() || workingTitle.trim();
    const description = finalForm.description.trim();
    const overallOutline = finalForm.overallOutline.trim();

    if (!title) {
      setError('书名不能为空');
      return;
    }
    if (!idea.trim()) {
      setError('idea 不能为空');
      return;
    }
    if (!genre.trim()) {
      setError('类型不能为空');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/novels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          genre,
          idea: idea.trim(),
          overallOutline,
        }),
      });

      const novel = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(novel?.error || '创建小说失败');
      }

      router.push(`/novels/${novel.id}/workbench`);
    } catch (e) {
      setError(getErrorMessage(e) || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#1a1816] transition-colors relative">
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiAvPjwvc3ZnPg==')]" />

      <ThemeToggle />

      <div className="container mx-auto px-4 py-8 max-w-4xl relative">
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
            新建小说（InkFlow）
          </h1>

          {error && <div className="mb-4 text-sm text-red-700 dark:text-red-400">{error}</div>}

          {step === 'idea' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  一句话灵感（idea）*
                </label>
                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-amber-700 dark:focus:border-amber-500 outline-none transition-colors resize-none"
                  placeholder="例如：一座废弃公寓里，住着一只会“听见人心”的鬼。"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    类型 *
                  </label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-amber-700 dark:focus:border-amber-500 outline-none transition-colors"
                  >
                    <option value="玄幻">玄幻</option>
                    <option value="都市">都市</option>
                    <option value="科幻">科幻</option>
                    <option value="武侠">武侠</option>
                    <option value="历史">历史</option>
                    <option value="游戏">游戏</option>
                    <option value="恐怖">恐怖</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    书名（可选）
                  </label>
                  <input
                    value={workingTitle}
                    onChange={(e) => setWorkingTitle(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-amber-700 dark:focus:border-amber-500 outline-none transition-colors"
                    placeholder="可先空着，后续从总纲候选选择"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateBlueprints}
                disabled={loadingBlueprints}
                className="w-full px-6 py-3 bg-amber-700 dark:bg-amber-600 text-white font-medium border-2 border-amber-900 dark:border-amber-700 hover:bg-amber-800 dark:hover:bg-amber-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {loadingBlueprints ? 'AI 生成中...' : 'AI 生成 3 个总纲候选'}
              </button>
            </div>
          )}

          {step === 'choose' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  从 3 个总纲候选中选择一个，然后可编辑后创建。
                </div>
                <button
                  type="button"
                  onClick={() => setStep('idea')}
                  className="px-4 py-2 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-amber-700 dark:hover:border-amber-500 transition-colors"
                >
                  返回修改 idea
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {blueprints.map((b, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedIndex(i)}
                    className={`text-left border-2 p-4 transition-all ${
                      selectedIndex === i
                        ? 'border-amber-700 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-amber-400 dark:hover:border-amber-700'
                    }`}
                  >
                    <div className="font-serif font-semibold text-gray-900 dark:text-amber-50 mb-2 line-clamp-2">
                      {b.title}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-4">
                      {b.description}
                    </div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    书名 *
                  </label>
                  <input
                    value={finalForm.title}
                    onChange={(e) => setFinalForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    一句话卖点/简介
                  </label>
                  <input
                    value={finalForm.description}
                    onChange={(e) => setFinalForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  总纲（overall outline）
                </label>
                <textarea
                  value={finalForm.overallOutline}
                  onChange={(e) => setFinalForm((p) => ({ ...p, overallOutline: e.target.value }))}
                  rows={14}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                />
              </div>

              <button
                type="button"
                onClick={handleCreateNovel}
                disabled={creating}
                className="w-full px-6 py-3 bg-purple-700 dark:bg-purple-600 text-white font-medium hover:bg-purple-800 dark:hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {creating ? '创建中...' : '创建小说并进入 Workbench'}
              </button>

              <div className="text-xs text-gray-500 dark:text-gray-500">
                创建后会自动创建 5 个分卷（卷一~卷五），并进入 Workbench 进行卷纲/章纲/正文创作。
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
