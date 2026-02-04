'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { InlineChapterEditor } from '@/components/InlineChapterEditor';
import type { Chapter, ChapterPlan, Novel, Volume } from '@/lib/types';

interface WorkbenchPayload {
  novel: Novel;
  volumes: Volume[];
  chapterPlans: ChapterPlan[];
  chapters: Array<Pick<Chapter, 'id' | 'number' | 'title' | 'outline' | 'wordCount' | 'createdAt' | 'planId' | 'volumeId'>>;
}

type PanelTab = 'writing' | 'memory' | 'foreshadowing' | 'annotations';

function normalizeTagsInput(value: string): string[] {
  return value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

function getErrorFromBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  if (!('error' in body)) return null;
  const maybe = (body as { error?: unknown }).error;
  return typeof maybe === 'string' ? maybe : null;
}

function isStreamDeltaMessage(msg: unknown): msg is { type: 'delta'; text: string } {
  if (!msg || typeof msg !== 'object') return false;
  const maybe = msg as { type?: unknown; text?: unknown };
  return maybe.type === 'delta' && typeof maybe.text === 'string';
}

async function readNdjsonStream(
  res: Response,
  onMessage: (msg: unknown) => void
): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx = buffer.indexOf('\n');
    while (idx !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (line) {
        try {
          onMessage(JSON.parse(line));
        } catch {
          // ignore
        }
      }
      idx = buffer.indexOf('\n');
    }
  }
}

export default function WorkbenchClient({ novelId }: { novelId: string }) {
  const [data, setData] = useState<WorkbenchPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false);
  const [tab, setTab] = useState<PanelTab>('writing');

  const [selectedVolumeId, setSelectedVolumeId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const [activeTechniqueTagsInput, setActiveTechniqueTagsInput] = useState('');

  const [volumeForm, setVolumeForm] = useState<{ title: string; outline: string; targetChapters: string }>({
    title: '',
    outline: '',
    targetChapters: '',
  });
  const [savingVolume, setSavingVolume] = useState(false);

  const [planForm, setPlanForm] = useState<{ title: string; outline: string }>({ title: '', outline: '' });
  const [savingPlan, setSavingPlan] = useState(false);
  const [confirmingPlan, setConfirmingPlan] = useState(false);

  const [batchCount, setBatchCount] = useState('10');
  const [generatingPlans, setGeneratingPlans] = useState(false);

  const [generatingVolumes, setGeneratingVolumes] = useState(false);

  const [chapterLoading, setChapterLoading] = useState(false);
  const [chapter, setChapter] = useState<Chapter | null>(null);

  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');

  const chapterByPlanId = useMemo(() => {
    const map = new Map<string, WorkbenchPayload['chapters'][number]>();
    data?.chapters.forEach((c) => {
      if (c.planId) {
        map.set(c.planId, c);
      }
    });
    return map;
  }, [data]);

  const selectedVolume = useMemo(
    () => data?.volumes.find((v) => v.id === selectedVolumeId) || null,
    [data, selectedVolumeId]
  );

  const selectedPlan = useMemo(
    () => data?.chapterPlans.find((p) => p.id === selectedPlanId) || null,
    [data, selectedPlanId]
  );

  const selectedPlanChapterMeta = useMemo(() => {
    if (!selectedPlanId) return null;
    const plan = data?.chapterPlans.find((p) => p.id === selectedPlanId);
    if (!plan) return null;
    return chapterByPlanId.get(plan.id) || null;
  }, [data, selectedPlanId, chapterByPlanId]);

  const selectedChapterId = selectedPlanChapterMeta?.id || null;

  const activeTechniqueTags = useMemo(
    () => normalizeTagsInput(activeTechniqueTagsInput),
    [activeTechniqueTagsInput]
  );

  const loadWorkbench = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/novels/${novelId}/workbench`);
      const json = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        throw new Error(getErrorFromBody(json) || 'Failed to load workbench');
      }
      const payload = json as WorkbenchPayload;
      setData(payload);

      // default selection
      const firstVolume = payload.volumes?.[0];
      if (firstVolume && !selectedVolumeId) {
        setSelectedVolumeId(firstVolume.id);
      }
    } catch (e) {
      setError(getErrorMessage(e) || 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkbench();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [novelId]);

  useEffect(() => {
    if (!selectedVolume) return;
    setVolumeForm({
      title: selectedVolume.title || '',
      outline: selectedVolume.outline || '',
      targetChapters: selectedVolume.targetChapters ? String(selectedVolume.targetChapters) : '',
    });
  }, [selectedVolume]);

  useEffect(() => {
    if (!selectedPlan) return;
    setPlanForm({ title: selectedPlan.title || '', outline: selectedPlan.outline || '' });
  }, [selectedPlan]);

  useEffect(() => {
    let cancelled = false;

    const loadChapter = async () => {
      if (!selectedChapterId) {
        setChapter(null);
        return;
      }

      setChapterLoading(true);
      try {
        const res = await fetch(`/api/novels/${novelId}/chapters/${selectedChapterId}`);
        const json = (await res.json().catch(() => null)) as unknown;
        if (!res.ok) {
          throw new Error(getErrorFromBody(json) || 'Failed to load chapter');
        }
        if (!cancelled) {
          setChapter(json as Chapter);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setChapter(null);
        }
      } finally {
        if (!cancelled) {
          setChapterLoading(false);
        }
      }
    };

    loadChapter();
    return () => {
      cancelled = true;
    };
  }, [novelId, selectedChapterId]);

  const selectVolume = (volumeId: string) => {
    setSelectedVolumeId(volumeId);
    setSelectedPlanId(null);
    setMobileOutlineOpen(false);
  };

  const selectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    setMobileOutlineOpen(false);
  };

  const handleGenerateVolumes = async () => {
    setGeneratingVolumes(true);
    try {
      const res = await fetch(`/api/novels/${novelId}/volumes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 5 }),
      });
      const json = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) throw new Error(getErrorFromBody(json) || '生成卷纲失败');
      await loadWorkbench();
    } catch (e) {
      alert(getErrorMessage(e) || '生成卷纲失败');
    } finally {
      setGeneratingVolumes(false);
    }
  };

  const handleSaveVolume = async () => {
    if (!selectedVolume) return;
    setSavingVolume(true);
    try {
      const res = await fetch(`/api/novels/${novelId}/volumes/${selectedVolume.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: volumeForm.title,
          outline: volumeForm.outline,
          targetChapters: volumeForm.targetChapters ? Number(volumeForm.targetChapters) : null,
        }),
      });
      const json = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) throw new Error(getErrorFromBody(json) || '保存失败');
      await loadWorkbench();
    } catch (e) {
      alert(getErrorMessage(e) || '保存失败');
    } finally {
      setSavingVolume(false);
    }
  };

  const handleGeneratePlans = async () => {
    if (!selectedVolume) return;
    setGeneratingPlans(true);
    try {
      const count = Math.max(1, Math.min(20, Number(batchCount) || 10));
      const res = await fetch(
        `/api/novels/${novelId}/volumes/${selectedVolume.id}/chapter-plans/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count }),
        }
      );
      const json = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) throw new Error(getErrorFromBody(json) || '生成章纲失败');
      await loadWorkbench();
    } catch (e) {
      alert(getErrorMessage(e) || '生成章纲失败');
    } finally {
      setGeneratingPlans(false);
    }
  };

  const handleSavePlan = async () => {
    if (!selectedPlan) return;
    setSavingPlan(true);
    try {
      const res = await fetch(`/api/novels/${novelId}/chapter-plans/${selectedPlan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: planForm.title,
          outline: planForm.outline,
          changeDescription: 'Workbench 编辑章纲',
        }),
      });
      const json = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) throw new Error(getErrorFromBody(json) || '保存失败');
      await loadWorkbench();
    } catch (e) {
      alert(getErrorMessage(e) || '保存失败');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleConfirmPlan = async () => {
    if (!selectedPlan) return;
    setConfirmingPlan(true);
    try {
      const res = await fetch(`/api/novels/${novelId}/chapter-plans/${selectedPlan.id}/confirm`, {
        method: 'POST',
      });
      const json = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) throw new Error(getErrorFromBody(json) || '确认失败');
      await loadWorkbench();
    } catch (e) {
      alert(getErrorMessage(e) || '确认失败');
    } finally {
      setConfirmingPlan(false);
    }
  };

  const handleGenerateChapterByPlan = async () => {
    if (!selectedPlan) return;
    setStreaming(true);
    setStreamText('');

    try {
      const res = await fetch(
        `/api/novels/${novelId}/chapter-plans/${selectedPlan.id}/generate?stream=1`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ techniqueTags: activeTechniqueTags }),
        }
      );

      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as unknown;
        throw new Error(getErrorFromBody(json) || '生成失败');
      }

      await readNdjsonStream(res, (msg) => {
        if (isStreamDeltaMessage(msg)) {
          setStreamText((prev) => prev + msg.text);
        }
      });

      await loadWorkbench();
    } catch (e) {
      alert(getErrorMessage(e) || '生成失败');
    } finally {
      setStreaming(false);
    }
  };

  const OutlinePanel = (
    <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-4 h-full">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="font-serif font-semibold text-gray-900 dark:text-amber-50">大纲</div>
        <button
          type="button"
          onClick={handleGenerateVolumes}
          disabled={generatingVolumes}
          className="px-3 py-1 text-sm bg-amber-700 dark:bg-amber-600 text-white hover:bg-amber-800 dark:hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          {generatingVolumes ? '生成中...' : 'AI 生成卷纲'}
        </button>
      </div>

      {data?.volumes?.length ? (
        <div className="space-y-3">
          {data.volumes.map((v) => {
            const plans = data.chapterPlans.filter((p) => p.volumeId === v.id);
            return (
              <div key={v.id} className="border border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => selectVolume(v.id)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between gap-3 ${
                    selectedVolumeId === v.id
                      ? 'bg-amber-50 dark:bg-amber-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-amber-50 truncate">
                      第{v.number}卷 · {v.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      {plans.length} 章纲{v.targetChapters ? ` / 目标 ${v.targetChapters}` : ''}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-600 font-mono">{v.number}</div>
                </button>

                {selectedVolumeId === v.id && plans.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-800 divide-y divide-gray-200 dark:divide-gray-800">
                    {plans.map((p) => {
                      const hasChapter = Boolean(chapterByPlanId.get(p.id));
                      const badge =
                        p.status === 'confirmed'
                          ? '已确认'
                          : p.status === 'draft'
                            ? '草稿'
                            : p.status === 'drafted'
                              ? '已成文'
                              : '完成';

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => selectPlan(p.id)}
                          className={`w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/40 ${
                            selectedPlanId === p.id ? 'bg-purple-50 dark:bg-purple-900/15' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm text-gray-900 dark:text-amber-50 truncate">
                              {p.number}. {p.title}
                            </div>
                            <div className="flex items-center gap-2">
                              {hasChapter && (
                                <span className="text-[10px] px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-800">
                                  正文
                                </span>
                              )}
                              <span className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                {badge}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-gray-500 dark:text-gray-500">暂无分卷，点击“AI 生成卷纲”开始</div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6 text-gray-600 dark:text-gray-400">
        正在加载 Workbench...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6">
        <div className="text-red-700 dark:text-red-400 mb-3">{error || '加载失败'}</div>
        <button
          type="button"
          onClick={loadWorkbench}
          className="px-4 py-2 bg-amber-700 dark:bg-amber-600 text-white hover:bg-amber-800 dark:hover:bg-amber-700 transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Mobile outline drawer toggle */}
      <div className="lg:hidden flex items-center justify-between gap-3 mb-4">
        <button
          type="button"
          onClick={() => setMobileOutlineOpen(true)}
          className="px-4 py-2 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200"
        >
          大纲
        </button>

        <div className="text-sm text-gray-600 dark:text-gray-400 font-mono truncate">
          {data.novel.title}
        </div>
      </div>

      {mobileOutlineOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden">
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-sm bg-[#faf8f5] dark:bg-[#1a1816] p-4 overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="font-serif font-semibold text-gray-900 dark:text-amber-50">大纲</div>
              <button
                type="button"
                onClick={() => setMobileOutlineOpen(false)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
              >
                关闭
              </button>
            </div>
            {OutlinePanel}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Outline */}
        <div className="hidden lg:block lg:col-span-3">{OutlinePanel}</div>

        {/* Middle: Editor */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-xl font-serif font-bold text-gray-900 dark:text-amber-50">
                  {data.novel.title}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {data.novel.genre} · {data.novel.idea ? `灵感：${data.novel.idea}` : '未填写灵感'}
                </div>
              </div>

              {selectedVolume && (
                <div className="flex items-center gap-2">
                  <input
                    value={batchCount}
                    onChange={(e) => setBatchCount(e.target.value)}
                    className="w-20 px-3 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    type="button"
                    onClick={handleGeneratePlans}
                    disabled={generatingPlans}
                    className="px-4 py-2 bg-purple-700 dark:bg-purple-600 text-white hover:bg-purple-800 dark:hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {generatingPlans ? '生成中...' : '生成章纲'}
                  </button>
                </div>
              )}
            </div>

            {!selectedVolume && (
              <div className="text-gray-600 dark:text-gray-400">请选择左侧分卷。</div>
            )}

            {selectedVolume && !selectedPlan && (
              <div className="space-y-4">
                <div className="text-sm text-gray-500 dark:text-gray-500">
                  编辑卷纲（第{selectedVolume.number}卷）
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    卷名
                  </label>
                  <input
                    value={volumeForm.title}
                    onChange={(e) => setVolumeForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      目标章数（可选）
                    </label>
                    <input
                      value={volumeForm.targetChapters}
                      onChange={(e) => setVolumeForm((p) => ({ ...p, targetChapters: e.target.value }))}
                      placeholder="例如 100"
                      className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      卷纲
                    </label>
                    <textarea
                      value={volumeForm.outline}
                      onChange={(e) => setVolumeForm((p) => ({ ...p, outline: e.target.value }))}
                      rows={8}
                      className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveVolume}
                  disabled={savingVolume}
                  className="px-4 py-2 bg-amber-700 dark:bg-amber-600 text-white hover:bg-amber-800 dark:hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  {savingVolume ? '保存中...' : '保存卷纲'}
                </button>
              </div>
            )}

            {selectedPlan && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-gray-500 dark:text-gray-500">
                    第{selectedPlan.number}章 · 章纲状态：
                    <span className="font-mono ml-2">{selectedPlan.status}</span>
                  </div>
                  {selectedPlanChapterMeta && (
                    <Link
                      href={`/novels/${novelId}/chapters/${selectedPlanChapterMeta.id}`}
                      className="text-sm text-amber-700 dark:text-amber-500 hover:underline"
                    >
                      打开章节页
                    </Link>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    章标题
                  </label>
                  <input
                    value={planForm.title}
                    onChange={(e) => setPlanForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    章梗概（100-200字建议）
                  </label>
                  <textarea
                    value={planForm.outline}
                    onChange={(e) => setPlanForm((p) => ({ ...p, outline: e.target.value }))}
                    rows={8}
                    className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSavePlan}
                    disabled={savingPlan}
                    className="px-4 py-2 bg-amber-700 dark:bg-amber-600 text-white hover:bg-amber-800 dark:hover:bg-amber-700 transition-colors disabled:opacity-50"
                  >
                    {savingPlan ? '保存中...' : '保存章纲'}
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmPlan}
                    disabled={confirmingPlan || selectedPlan.status !== 'draft'}
                    className="px-4 py-2 bg-gray-700 dark:bg-gray-600 text-white hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {confirmingPlan ? '确认中...' : '确认章纲'}
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateChapterByPlan}
                    disabled={streaming || selectedPlan.status !== 'confirmed' || Boolean(selectedPlanChapterMeta)}
                    className="px-4 py-2 bg-purple-700 dark:bg-purple-600 text-white hover:bg-purple-800 dark:hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {streaming ? '生成中...' : '生成正文（流式）'}
                  </button>
                </div>

                {streaming && (
                  <div className="border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-4 max-h-[320px] overflow-auto whitespace-pre-wrap font-serif text-sm text-gray-900 dark:text-gray-100">
                    {streamText || '...'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chapter content (inline) */}
          {selectedPlanChapterMeta && (
            <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="font-serif font-semibold text-gray-900 dark:text-amber-50">
                  正文（第{selectedPlanChapterMeta.number}章）
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 font-mono">
                  {selectedPlanChapterMeta.wordCount} 字
                </div>
              </div>

              {chapterLoading && (
                <div className="text-sm text-gray-500 dark:text-gray-500">加载正文中...</div>
              )}

              {!chapterLoading && chapter && (
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <InlineChapterEditor
                    novelId={novelId}
                    chapterId={chapter.id}
                    initialContent={chapter.content}
                    techniqueTags={activeTechniqueTags}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Assistant */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              {(['writing', 'memory', 'foreshadowing', 'annotations'] as PanelTab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`px-3 py-1 text-sm border ${
                    tab === t
                      ? 'border-amber-700 dark:border-amber-500 text-amber-800 dark:text-amber-200'
                      : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t === 'writing' ? '写作' : t === 'memory' ? '记忆' : t === 'foreshadowing' ? '伏笔' : '批注'}
                </button>
              ))}
            </div>

            {tab === 'writing' && (
              <div className="space-y-3">
                <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">技法标签（逗号分隔）</div>
                <input
                  value={activeTechniqueTagsInput}
                  onChange={(e) => setActiveTechniqueTagsInput(e.target.value)}
                  placeholder="例如：恐怖氛围, 克苏鲁, 黄金三章"
                  className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  该标签会注入“章纲生成正文”与“选中文本 AI 改写”的提示词（通过 Tech RAG 检索技法）。
                </div>
              </div>
            )}

            {tab === 'memory' && (
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <div>快速入口：</div>
                <div className="flex flex-col gap-2">
                  <Link href={`/novels/${novelId}/memory`} className="text-amber-700 dark:text-amber-500 hover:underline">
                    打开记忆系统
                  </Link>
                  <Link href={`/novels/${novelId}/knowledge-graph`} className="text-purple-700 dark:text-purple-400 hover:underline">
                    打开图谱
                  </Link>
                </div>
              </div>
            )}

            {tab === 'foreshadowing' && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                伏笔提醒（v2）：优先通过“生成正文时的伏笔注入”来约束剧情；更细的追踪面板后续补齐。
              </div>
            )}

            {tab === 'annotations' && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                批注（Reviewer Loop）入口在章节正文的“原地编辑”里：选中片段 → 添加批注 → AI 改写 → 应用并保存。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
