'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ReviewIssue {
  type: string;
  severity: string;
  description: string;
  suggestion: string;
}

interface ReviewResult {
  issues: ReviewIssue[];
  overall: string;
}

export function ReviewChapterButton({ novelId, chapterId }: { novelId: string; chapterId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);

  const handleReview = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/novels/${novelId}/chapters/${chapterId}/review`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (error) {
      console.error('Failed to review chapter:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!result || result.issues.length === 0) return;

    setRegenerating(true);
    try {
      const suggestions = result.issues.map(issue => issue.suggestion);
      const res = await fetch(`/api/novels/${novelId}/chapters/${chapterId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestions }),
      });
      if (res.ok) {
        router.refresh();
        setResult(null);
      }
    } catch (error) {
      console.error('Failed to regenerate chapter:', error);
    } finally {
      setRegenerating(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case '严重': return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case '中等': return 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20';
      case '轻微': return 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      default: return 'text-gray-700 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  return (
    <div>
      <button
        onClick={handleReview}
        disabled={loading}
        className="px-6 py-2 bg-purple-700 dark:bg-purple-600 text-white font-medium hover:bg-purple-800 dark:hover:bg-purple-700 transition-colors disabled:opacity-50"
      >
        {loading ? '审核中...' : '毒舌编辑审核'}
      </button>

      {result && (
        <div className="mt-6 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6">
          <h3 className="text-xl font-serif font-semibold text-gray-900 dark:text-amber-50 mb-4">
            审核结果
          </h3>

          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 border-l-4 border-purple-700 dark:border-purple-500">
            <p className="text-gray-700 dark:text-gray-300">{result.overall}</p>
          </div>

          {result.issues.length > 0 && (
            <>
              <div className="space-y-4 mb-6">
                <h4 className="font-medium text-gray-900 dark:text-amber-50">发现的问题:</h4>
                {result.issues.map((issue, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-800 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                        {issue.severity}
                      </span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {issue.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {issue.description}
                    </p>
                    <p className="text-sm text-purple-700 dark:text-purple-400">
                      💡 {issue.suggestion}
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="w-full px-6 py-3 bg-amber-700 dark:bg-amber-600 text-white font-medium hover:bg-amber-800 dark:hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {regenerating ? '重新生成中...' : '✨ 应用建议并重新生成'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
