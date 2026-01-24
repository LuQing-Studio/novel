'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface GenerateStreamEvent {
  type: 'start' | 'delta' | 'done' | 'error';
  chapterNumber?: number;
  text?: string;
  chapterId?: string;
  error?: string;
}

export function GenerateChapterButton({ novelId }: { novelId: string }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [outline, setOutline] = useState('');
  const [streamedContent, setStreamedContent] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStreamedContent('');
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/novels/${novelId}/generate?stream=1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outline }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        setErrorMessage(error?.error || '生成失败');
        return;
      }

      if (!res.body) {
        const chapter = await res.json();
        router.push(`/novels/${novelId}/chapters/${chapter.id}`);
        router.refresh();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const raw of lines) {
          const line = raw.trim();
          if (!line) continue;

          let event: GenerateStreamEvent | null = null;
          try {
            event = JSON.parse(line) as GenerateStreamEvent;
          } catch {
            continue;
          }

          if (event.type === 'delta' && typeof event.text === 'string') {
            setStreamedContent((prev) => prev + event.text);
          }

          if (event.type === 'error') {
            setErrorMessage(event.error || '生成失败');
            return;
          }

          if (event.type === 'done' && event.chapterId) {
            router.push(`/novels/${novelId}/chapters/${event.chapterId}`);
            router.refresh();
            return;
          }
        }
      }
    } catch (error) {
      console.error('Failed to generate chapter:', error);
      setErrorMessage('生成失败');
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="px-6 py-3 bg-amber-700 dark:bg-amber-600 text-white font-medium hover:bg-amber-800 dark:hover:bg-amber-700 transition-colors"
      >
        + 生成新章节
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6 mb-6">
      <h3 className="text-xl font-serif font-semibold text-gray-900 dark:text-amber-50 mb-4">
        生成新章节
      </h3>
      <form onSubmit={handleGenerate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            章节大纲 *
          </label>
          <textarea
            required
            value={outline}
            onChange={(e) => setOutline(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-amber-700 dark:focus:border-amber-500 outline-none transition-colors resize-none"
            placeholder="简要描述这一章的主要内容和情节..."
          />
        </div>
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-amber-700 dark:bg-amber-600 text-white font-medium hover:bg-amber-800 dark:hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {loading ? '生成中...' : '开始生成'}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="px-6 py-2 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:border-amber-700 dark:hover:border-amber-500 transition-colors"
          >
            取消
          </button>
        </div>

        {(errorMessage || streamedContent) && (
          <div className="border-2 border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">实时预览</h4>
              {loading && (
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">streaming...</span>
              )}
            </div>

            {errorMessage && (
              <div className="text-sm text-red-700 dark:text-red-400 mb-2">
                {errorMessage}
              </div>
            )}

            <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed font-serif max-h-[40vh] overflow-auto">
              {streamedContent || (loading ? '...' : '')}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
