'use client';

import { useMemo, useState } from 'react';

interface ChapterMeta {
  id: string;
  number: number;
  title: string;
}

function parseNumberSpec(spec: string): number[] {
  const result: number[] = [];
  const tokens = spec
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  for (const token of tokens) {
    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      const min = Math.min(start, end);
      const max = Math.max(start, end);
      for (let n = min; n <= max; n += 1) result.push(n);
      continue;
    }

    const n = Number(token);
    if (Number.isFinite(n)) result.push(n);
  }

  return Array.from(new Set(result.filter((n) => n > 0))).sort((a, b) => a - b);
}

export function ExportButton({ novelId, chapters }: { novelId: string; chapters: ChapterMeta[] }) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [numberSpec, setNumberSpec] = useState('');
  const [filter, setFilter] = useState('');

  const chaptersByNumber = useMemo(() => {
    const map = new Map<number, ChapterMeta>();
    chapters.forEach((c) => map.set(c.number, c));
    return map;
  }, [chapters]);

  const filteredChapters = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return chapters;
    return chapters.filter((c) => {
      return String(c.number).includes(q) || c.title.toLowerCase().includes(q);
    });
  }, [chapters, filter]);

  const handleExportAll = () => {
    window.open(`/api/novels/${novelId}/export`, '_blank');
  };

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectByNumbers = () => {
    const nums = parseNumberSpec(numberSpec);
    if (nums.length === 0) return;

    setSelectedIds((prev) => {
      const next = new Set(prev);
      nums.forEach((n) => {
        const chapter = chaptersByNumber.get(n);
        if (chapter) next.add(chapter.id);
      });
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredChapters.forEach((c) => next.add(c.id));
      return next;
    });
  };

  const exportSelected = () => {
    if (selectedIds.size === 0) return;
    const selected = chapters
      .filter((c) => selectedIds.has(c.id))
      .sort((a, b) => a.number - b.number)
      .map((c) => c.id);

    const params = new URLSearchParams();
    params.set('chapterIds', selected.join(','));
    window.open(`/api/novels/${novelId}/export?${params.toString()}`, '_blank');
  };

  return (
    <>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="px-6 py-2 bg-green-700 dark:bg-green-600 text-white font-medium hover:bg-green-800 dark:hover:bg-green-700 transition-colors"
        >
          📥 导出 TXT
        </button>
      ) : (
        <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-serif font-semibold text-gray-900 dark:text-amber-50">
              导出 TXT
            </h3>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={handleExportAll}
              className="px-4 py-2 bg-green-700 dark:bg-green-600 text-white font-medium hover:bg-green-800 dark:hover:bg-green-700 transition-colors"
            >
              导出全文
            </button>

            <button
              onClick={exportSelected}
              disabled={selectedIds.size === 0}
              className="px-4 py-2 bg-amber-700 dark:bg-amber-600 text-white font-medium hover:bg-amber-800 dark:hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              导出选中章节（{selectedIds.size}）
            </button>

            <button
              onClick={clearSelection}
              className="px-4 py-2 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:border-amber-700 dark:hover:border-amber-500 transition-colors"
            >
              清空选择
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                按章号选择（例如：1,3,10-12）
              </label>
              <div className="flex gap-2">
                <input
                  value={numberSpec}
                  onChange={(e) => setNumberSpec(e.target.value)}
                  className="flex-1 px-3 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="1,3,10-12"
                />
                <button
                  onClick={selectByNumbers}
                  className="px-4 py-2 bg-blue-700 dark:bg-blue-600 text-white font-medium hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors"
                >
                  选择
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                搜索章节
              </label>
              <div className="flex gap-2">
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="flex-1 px-3 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="章号或标题关键词"
                />
                <button
                  onClick={selectAllFiltered}
                  className="px-4 py-2 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                >
                  全选(过滤后)
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-72 overflow-auto border border-gray-200 dark:border-gray-800">
            {filteredChapters.length === 0 ? (
              <div className="p-4 text-gray-500">无匹配章节</div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredChapters.map((chapter) => (
                  <li key={chapter.id} className="flex items-center gap-3 p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(chapter.id)}
                      onChange={() => toggleId(chapter.id)}
                    />
                    <div className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      第 {chapter.number} 章
                    </div>
                    <div className="flex-1 text-gray-900 dark:text-amber-50">
                      {chapter.title}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
