'use client';

import { useState } from 'react';

export function AutoExtractButton({ novelId, chapterId }: {
  novelId: string;
  chapterId: string;
}) {
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleExtract = async () => {
    setExtracting(true);
    setResult(null);
    try {
      const res = await fetch(`/api/novels/${novelId}/chapters/${chapterId}/auto-extract`, {
        method: 'POST',
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error('Failed to auto extract:', error);
      setResult({ errors: ['提取失败'] });
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleExtract}
        disabled={extracting}
        className="px-6 py-2 bg-green-700 dark:bg-green-600 text-white font-medium hover:bg-green-800 dark:hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        {extracting ? '提取中...' : '🤖 自动提取记忆'}
      </button>

      {result && (
        <div className="mt-4 p-4 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-amber-50 mb-2">提取结果</h4>
          <div className="space-y-2 text-sm">
            {result.charactersExtracted !== undefined && (
              <div className="text-gray-700 dark:text-gray-300">
                ✓ 提取人物: {result.charactersExtracted} 个
              </div>
            )}
            {result.lightragUploaded && (
              <div className="text-gray-700 dark:text-gray-300">
                ✓ 已上传到知识图谱
              </div>
            )}
            {result.errors && result.errors.length > 0 && (
              <div className="text-red-600 dark:text-red-400">
                {result.errors.map((err: string, i: number) => (
                  <div key={i}>✗ {err}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
