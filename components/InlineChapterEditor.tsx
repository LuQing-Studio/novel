'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type RewritePreset =
  | 'rewrite'
  | 'expand'
  | 'shorten'
  | 'more-dialogue'
  | 'more-sensory'
  | 'more-tense'
  | 'custom';

interface RewriteSuggestion {
  start: number;
  end: number;
  original: string;
  replacement: string;
  instruction: string;
}

function presetToInstruction(preset: RewritePreset): string {
  switch (preset) {
    case 'rewrite':
      return '重写这段：保持原意与信息不变，语言更自然、更有画面感，节奏更紧凑。';
    case 'expand':
      return '扩写这段：增加细节、动作与环境描写，让情绪更饱满，但不要改变剧情事实。';
    case 'shorten':
      return '精简这段：删掉冗余与重复，保留关键信息与节奏，语言更干练。';
    case 'more-dialogue':
      return '改写这段：让人物对话更有张力与个性，避免尬聊，保持原意。';
    case 'more-sensory':
      return '改写这段：加强感官描写（视觉/听觉/触觉/气味），但不要新增剧情事实。';
    case 'more-tense':
      return '改写这段：氛围更紧张、更压迫，冲突感更强，但不要改变剧情事实。';
    case 'custom':
      return '';
    default:
      return '';
  }
}

function safeTrim(value: string): string {
  return value.replace(/\s+$/g, '');
}

export function InlineChapterEditor({
  novelId,
  chapterId,
  initialContent,
}: {
  novelId: string;
  chapterId: string;
  initialContent: string;
}) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const initialContentRef = useRef(initialContent);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState(initialContent);

  const [rewritePreset, setRewritePreset] = useState<RewritePreset>('rewrite');
  const [customInstruction, setCustomInstruction] = useState('');
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<RewriteSuggestion | null>(null);

  useEffect(() => {
    setContent(initialContent);
    initialContentRef.current = initialContent;
  }, [initialContent]);

  const instruction = useMemo(() => {
    const presetInstruction = presetToInstruction(rewritePreset);
    if (rewritePreset === 'custom') return customInstruction.trim();
    return presetInstruction;
  }, [rewritePreset, customInstruction]);

  const hasUnsavedChanges = content !== initialContentRef.current;

  const handleStartEdit = () => {
    setEditing(true);
    setRewriteError(null);
    setSuggestion(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleCancel = () => {
    setContent(initialContentRef.current);
    setEditing(false);
    setRewriteError(null);
    setSuggestion(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setRewriteError(null);
    try {
      const previousContent = initialContentRef.current;
      const nextContent = safeTrim(content);

      if (previousContent !== nextContent) {
        await fetch(`/api/novels/${novelId}/chapters/${chapterId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: previousContent,
            changeDescription: '手动编辑保存前版本',
          }),
        });
      }

      const res = await fetch(`/api/novels/${novelId}/chapters/${chapterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: nextContent }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        setRewriteError(error?.error || '保存失败');
        return;
      }

      initialContentRef.current = nextContent;
      setEditing(false);
      setSuggestion(null);
      router.refresh();
    } catch (error) {
      console.error('Failed to save chapter:', error);
      setRewriteError('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleRewriteSelected = async () => {
    setRewriteError(null);
    setSuggestion(null);

    if (!instruction) {
      setRewriteError('请先填写改写指令');
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) {
      setRewriteError('编辑器未就绪');
      return;
    }

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    if (start === end) {
      setRewriteError('请先在编辑模式中选中一段文本');
      return;
    }

    const selected = content.slice(start, end);
    if (selected.trim().length < 20) {
      setRewriteError('选中文本太短（建议至少 20 字），请扩大选中范围');
      return;
    }
    const before = content.slice(Math.max(0, start - 500), start);
    const after = content.slice(end, Math.min(content.length, end + 500));

    setRewriteLoading(true);
    try {
      const res = await fetch(`/api/novels/${novelId}/chapters/${chapterId}/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: selected,
          instruction,
          preset: rewritePreset,
          before,
          after,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        setRewriteError(error?.error || '改写失败');
        return;
      }

      const data = (await res.json()) as { replacement?: string };
      const replacement = (data.replacement || '').trim();
      if (!replacement) {
        setRewriteError('改写结果为空');
        return;
      }

      setSuggestion({
        start,
        end,
        original: selected,
        replacement,
        instruction,
      });
    } catch (error) {
      console.error('Failed to rewrite selection:', error);
      setRewriteError('改写失败');
    } finally {
      setRewriteLoading(false);
    }
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    setContent((prev) => {
      const next = prev.slice(0, suggestion.start) + suggestion.replacement + prev.slice(suggestion.end);
      return next;
    });
    setSuggestion(null);
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = suggestion.start;
      const end = start + suggestion.replacement.length;
      textarea.focus();
      textarea.setSelectionRange(start, end);
    }, 0);
  };

  if (!editing) {
    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <button
            onClick={handleStartEdit}
            className="px-4 py-2 bg-gray-700 dark:bg-gray-600 text-white font-medium hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
          >
            ✏️ 原地编辑
          </button>
          <div className="text-xs text-gray-500 dark:text-gray-500 font-mono">
            进入编辑模式后可选中一段文本进行 AI 局部重写
          </div>
        </div>

        <div className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap font-serif text-lg">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={handleSave}
          disabled={saving || !hasUnsavedChanges}
          className="px-4 py-2 bg-amber-700 dark:bg-amber-600 text-white font-medium hover:bg-amber-800 dark:hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : '💾 保存'}
        </button>
        <button
          onClick={handleCancel}
          disabled={saving}
          className="px-4 py-2 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:border-amber-700 dark:hover:border-amber-500 transition-colors disabled:opacity-50"
        >
          取消
        </button>

        <div className="flex-1" />

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={rewritePreset}
            onChange={(e) => setRewritePreset(e.target.value as RewritePreset)}
            disabled={saving || rewriteLoading}
            className="px-3 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="rewrite">重写（更流畅）</option>
            <option value="expand">扩写（更细腻）</option>
            <option value="shorten">精简（更干练）</option>
            <option value="more-dialogue">对话更有张力</option>
            <option value="more-sensory">加强感官描写</option>
            <option value="more-tense">更紧张压迫</option>
            <option value="custom">自定义指令</option>
          </select>

          {rewritePreset === 'custom' && (
            <input
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              disabled={saving || rewriteLoading}
              placeholder="输入改写指令..."
              className="min-w-[240px] px-3 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          )}

          <button
            onClick={handleRewriteSelected}
            disabled={saving || rewriteLoading}
            className="px-4 py-2 bg-purple-700 dark:bg-purple-600 text-white font-medium hover:bg-purple-800 dark:hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {rewriteLoading ? 'AI 处理中...' : '✨ AI 处理选中'}
          </button>
        </div>
      </div>

      {rewriteError && (
        <div className="mb-4 text-sm text-red-700 dark:text-red-400">
          {rewriteError}
        </div>
      )}

      {suggestion && (
        <div className="mb-4 border-2 border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              AI 建议替换（选中片段）
            </div>
            <div className="flex gap-2">
              <button
                onClick={applySuggestion}
                className="px-3 py-1 text-sm bg-purple-700 dark:bg-purple-600 text-white hover:bg-purple-800 dark:hover:bg-purple-700 transition-colors"
              >
                应用
              </button>
              <button
                onClick={() => setSuggestion(null)}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 transition-colors"
              >
                取消
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">原文</div>
              <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 max-h-48 overflow-auto">
                {suggestion.original}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">改写后</div>
              <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 max-h-48 overflow-auto">
                {suggestion.replacement}
              </div>
            </div>
          </div>
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={24}
        className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-amber-700 dark:focus:border-amber-500 outline-none transition-colors resize-none font-serif text-lg leading-relaxed whitespace-pre-wrap"
      />
    </div>
  );
}
