'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function EditChapterButton({ novelId, chapterId, initialContent }: {
  novelId: string;
  chapterId: string;
  initialContent: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState(initialContent);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/novels/${novelId}/chapters/${chapterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to save chapter:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="px-6 py-2 bg-gray-700 dark:bg-gray-600 text-white font-medium hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
      >
        ✏️ 编辑章节
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6">
      <h3 className="text-xl font-serif font-semibold text-gray-900 dark:text-amber-50 mb-4">
        编辑章节内容
      </h3>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={20}
        className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-amber-700 dark:focus:border-amber-500 outline-none transition-colors resize-none font-serif"
      />

      <div className="flex gap-4 mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 px-6 py-3 bg-amber-700 dark:bg-amber-600 text-white font-medium hover:bg-amber-800 dark:hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : '💾 保存'}
        </button>
        <button
          onClick={() => {
            setContent(initialContent);
            setEditing(false);
          }}
          disabled={saving}
          className="px-6 py-3 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:border-amber-700 dark:hover:border-amber-500 transition-colors disabled:opacity-50"
        >
          取消
        </button>
      </div>
    </div>
  );
}
