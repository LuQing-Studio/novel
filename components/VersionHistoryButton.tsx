'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Version {
  id: string;
  version_number: number;
  content: string;
  word_count: number;
  created_at: string;
  change_description: string | null;
}

export function VersionHistoryButton({ novelId, chapterId }: {
  novelId: string;
  chapterId: string;
}) {
  const router = useRouter();
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);

  useEffect(() => {
    if (showHistory) {
      loadVersions();
    }
  }, [showHistory]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/novels/${novelId}/chapters/${chapterId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      }
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!confirm('确定要恢复到此版本吗?当前内容将被替换。')) return;

    try {
      const res = await fetch(`/api/novels/${novelId}/chapters/${chapterId}/versions/${versionId}/restore`, {
        method: 'POST',
      });
      if (res.ok) {
        setShowHistory(false);
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to restore version:', error);
    }
  };

  if (!showHistory) {
    return (
      <button
        onClick={() => setShowHistory(true)}
        className="px-6 py-2 bg-blue-700 dark:bg-blue-600 text-white font-medium hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors"
      >
        📜 版本历史
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-serif font-semibold text-gray-900 dark:text-amber-50">
          版本历史
        </h3>
        <button
          onClick={() => {
            setShowHistory(false);
            setSelectedVersion(null);
          }}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">加载中...</div>
      ) : versions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">暂无历史版本</div>
      ) : (
        <div className="space-y-3">
          {versions.map((version) => (
            <div
              key={version.id}
              className="border border-gray-200 dark:border-gray-800 p-4 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    版本 {version.version_number}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-500">
                    {new Date(version.created_at).toLocaleString('zh-CN')} · {version.word_count} 字
                  </div>
                  {version.change_description && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {version.change_description}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedVersion(selectedVersion?.id === version.id ? null : version)}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                  >
                    {selectedVersion?.id === version.id ? '收起' : '查看'}
                  </button>
                  <button
                    onClick={() => handleRestore(version.id)}
                    className="px-3 py-1 text-sm bg-blue-700 dark:bg-blue-600 text-white hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors"
                  >
                    恢复
                  </button>
                </div>
              </div>
              {selectedVersion?.id === version.id && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {version.content}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
