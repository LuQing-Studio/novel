'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Technique } from '@/lib/types';

interface TechniqueVersion {
  id: string;
  versionNumber: number;
  createdAt: string;
  changeDescription: string | null;
  createdBy: string;
}

function normalizeTags(value: string): string[] {
  return value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export default function TechniquesClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [queryText, setQueryText] = useState('');
  const [tag, setTag] = useState('');

  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [form, setForm] = useState<{ title: string; tags: string; content: string }>({
    title: '',
    tags: '',
    content: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versions, setVersions] = useState<TechniqueVersion[]>([]);
  const [restoring, setRestoring] = useState(false);

  const selected = useMemo(
    () => techniques.find((t) => t.id === selectedId) || null,
    [techniques, selectedId]
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    techniques.forEach((t) => (t.tags || []).forEach((x) => set.add(x)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }, [techniques]);

  const loadTechniques = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (queryText.trim()) params.set('query', queryText.trim());
      if (tag.trim()) params.set('tag', tag.trim());
      const res = await fetch(`/api/techniques?${params.toString()}`);
      const json = (await res.json()) as any;
      if (!res.ok) throw new Error(json?.error || '加载失败');
      setTechniques(Array.isArray(json) ? (json as Technique[]) : []);
      if (!selectedId && Array.isArray(json) && json.length > 0) {
        setSelectedId(json[0].id);
      }
    } catch (e: any) {
      setError(e?.message || '加载失败');
      setTechniques([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTechniques();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) return;
    setForm({
      title: selected.title || '',
      tags: (selected.tags || []).join(', '),
      content: selected.content || '',
    });
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNew = () => {
    setSelectedId(null);
    setForm({ title: '', tags: '', content: '' });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        tags: normalizeTags(form.tags),
        content: form.content.trim(),
      };

      if (!payload.title) throw new Error('标题不能为空');
      if (!payload.content) throw new Error('内容不能为空');

      if (selectedId) {
        const res = await fetch(`/api/techniques/${selectedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || '保存失败');
      } else {
        const res = await fetch('/api/techniques', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || '保存失败');
        if (json?.id) {
          setSelectedId(json.id);
        }
      }

      await loadTechniques();
    } catch (e: any) {
      setError(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm('确定要删除该技法吗？（无法撤销）')) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/techniques/${selectedId}`, { method: 'DELETE' });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || '删除失败');
      setSelectedId(null);
      setForm({ title: '', tags: '', content: '' });
      await loadTechniques();
    } catch (e: any) {
      setError(e?.message || '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const loadVersions = async () => {
    if (!selectedId) return;
    setVersionsLoading(true);
    try {
      const res = await fetch(`/api/techniques/${selectedId}/versions`);
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || '加载版本失败');
      setVersions(Array.isArray(json) ? json : []);
    } catch (e) {
      console.error(e);
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!selectedId) return;
    if (!confirm('恢复到该版本？当前内容会被覆盖。')) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/techniques/${selectedId}/versions/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || '恢复失败');
      await loadTechniques();
      await loadVersions();
    } catch (e: any) {
      setError(e?.message || '恢复失败');
    } finally {
      setRestoring(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6 text-gray-600 dark:text-gray-400">
        正在加载技法库...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-4 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="搜索标题/内容..."
            className="flex-1 min-w-[180px] px-3 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="px-3 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">全部标签</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={loadTechniques}
            className="px-4 py-2 bg-amber-700 dark:bg-amber-600 text-white hover:bg-amber-800 dark:hover:bg-amber-700 transition-colors"
          >
            搜索
          </button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="font-serif font-semibold text-gray-900 dark:text-amber-50">技法列表</div>
          <button
            type="button"
            onClick={handleNew}
            className="px-3 py-1 text-sm bg-purple-700 dark:bg-purple-600 text-white hover:bg-purple-800 dark:hover:bg-purple-700 transition-colors"
          >
            + 新建
          </button>
        </div>

        {techniques.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-500">暂无技法</div>
        ) : (
          <div className="space-y-2 max-h-[520px] overflow-auto">
            {techniques.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left p-3 border ${
                  selectedId === t.id
                    ? 'border-amber-700 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                    : 'border-gray-200 dark:border-gray-800 hover:border-amber-300 dark:hover:border-amber-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-gray-900 dark:text-amber-50 truncate">{t.title}</div>
                  <span
                    className={`text-[10px] px-2 py-0.5 border ${
                      t.syncStatus === 'synced'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-800'
                        : t.syncStatus === 'failed'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {t.syncStatus === 'synced' ? '已同步' : t.syncStatus === 'failed' ? '同步失败' : '待同步'}
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-500 line-clamp-1">
                  {(t.tags || []).join(' · ') || '无标签'}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="lg:col-span-8 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="font-serif font-semibold text-gray-900 dark:text-amber-50">
            {selectedId ? '编辑技法' : '新建技法'}
          </div>
          <div className="flex items-center gap-2">
            {selectedId && (
              <button
                type="button"
                onClick={() => {
                  setVersionsOpen(true);
                  loadVersions();
                }}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-amber-500 dark:hover:border-amber-500 transition-colors"
              >
                版本历史
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-amber-700 dark:bg-amber-600 text-white hover:bg-amber-800 dark:hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
            {selectedId && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 border-2 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                {deleting ? '删除中...' : '删除'}
              </button>
            )}
          </div>
        </div>

        {error && <div className="mb-3 text-sm text-red-700 dark:text-red-400">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">标题</label>
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              标签（逗号分隔）
            </label>
            <input
              value={form.tags}
              onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
              placeholder="例如：恐怖氛围, 黄金三章, 战斗描写"
              className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">内容</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              rows={18}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
            />
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
              保存后会尝试同步到 Tech LightRAG（用于写作时检索技法）。
            </div>
          </div>
        </div>
      </div>

      {versionsOpen && selectedId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-serif font-semibold text-gray-900 dark:text-amber-50">版本历史</div>
              <button
                type="button"
                onClick={() => setVersionsOpen(false)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
              >
                关闭
              </button>
            </div>

            {versionsLoading ? (
              <div className="text-sm text-gray-500 dark:text-gray-500">加载中...</div>
            ) : versions.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-500">暂无版本</div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-auto">
                {versions.map((v) => (
                  <div key={v.id} className="border border-gray-200 dark:border-gray-800 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm text-gray-900 dark:text-amber-50 font-medium">
                        v{v.versionNumber}
                      </div>
                      <button
                        type="button"
                        disabled={restoring}
                        onClick={() => handleRestore(v.id)}
                        className="px-3 py-1 text-sm bg-purple-700 dark:bg-purple-600 text-white hover:bg-purple-800 dark:hover:bg-purple-700 transition-colors disabled:opacity-50"
                      >
                        恢复
                      </button>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                      {new Date(v.createdAt).toLocaleString('zh-CN')} · {v.changeDescription || '（无说明）'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

