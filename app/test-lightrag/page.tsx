'use client';

import { useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import Link from 'next/link';

type QueryMode = 'local' | 'global' | 'hybrid' | 'naive' | 'mix';

export default function LightRAGTestPage() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<QueryMode>('hybrid');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [uploadContent, setUploadContent] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  const [status, setStatus] = useState<any>(null);

  const handleQuery = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await fetch('/api/lightrag/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, mode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Query failed');
        return;
      }

      setResponse(data.response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadContent.trim()) return;

    setUploadLoading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const res = await fetch('/api/lightrag/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: uploadContent }),
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || 'Upload failed');
        return;
      }

      setUploadSuccess(data.message || 'Document uploaded successfully');
      setUploadContent('');
      fetchStatus();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setUploadLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/lightrag/documents');
      const data = await res.json();
      if (res.ok) {
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#1a1816] transition-colors relative">
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiAvPjwvc3ZnPg==')]" />

      <ThemeToggle />

      <div className="container mx-auto px-4 py-8 max-w-6xl relative">
        <Link
          href="/"
          className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-amber-700 dark:hover:text-amber-500 mb-8 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回首页
        </Link>

        <header className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-gray-900 dark:text-amber-50 mb-2">
            LightRAG 测试
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            测试 LightRAG 知识图谱和向量检索集成
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Query Section */}
          <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6">
            <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-amber-50 mb-4">
              查询知识库
            </h2>

            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              查询模式
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as QueryMode)}
              className="w-full p-2 mb-4 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-amber-700 dark:focus:border-amber-500 outline-none transition-colors"
            >
              <option value="local">Local (实体级检索)</option>
              <option value="global">Global (关系级检索)</option>
              <option value="hybrid">Hybrid (混合模式)</option>
              <option value="naive">Naive (简单向量搜索)</option>
              <option value="mix">Mix (高级模式)</option>
            </select>

            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              输入查询
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-amber-700 dark:focus:border-amber-500 outline-none transition-colors"
              rows={4}
              placeholder="例如: 主角的能力是什么?"
            />

            <button
              onClick={handleQuery}
              disabled={loading || !query.trim()}
              className="mt-4 px-6 py-3 bg-amber-700 dark:bg-amber-600 text-white font-medium hover:bg-amber-800 dark:hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '查询中...' : '查询'}
            </button>

            {error && (
              <div className="mt-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 p-4">
                <p className="text-red-700 dark:text-red-400 font-medium">错误</p>
                <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
              </div>
            )}

            {response && (
              <div className="mt-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 p-4">
                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{response}</p>
              </div>
            )}
          </div>

          {/* Upload Section */}
          <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6">
            <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-amber-50 mb-4">
              上传文档
            </h2>

            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              文档内容
            </label>
            <textarea
              value={uploadContent}
              onChange={(e) => setUploadContent(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-amber-700 dark:focus:border-amber-500 outline-none transition-colors"
              rows={6}
              placeholder="输入要索引的文档内容..."
            />

            <button
              onClick={handleUpload}
              disabled={uploadLoading || !uploadContent.trim()}
              className="mt-4 px-6 py-3 bg-amber-700 dark:bg-amber-600 text-white font-medium hover:bg-amber-800 dark:hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploadLoading ? '上传中...' : '上传文档'}
            </button>

            {uploadError && (
              <div className="mt-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 p-4">
                <p className="text-red-700 dark:text-red-400 font-medium">错误</p>
                <p className="text-red-600 dark:text-red-300 text-sm mt-1">{uploadError}</p>
              </div>
            )}

            {uploadSuccess && (
              <div className="mt-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 p-4">
                <p className="text-green-700 dark:text-green-400 font-medium">成功</p>
                <p className="text-green-600 dark:text-green-300 text-sm mt-1">{uploadSuccess}</p>
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={fetchStatus}
                className="px-4 py-2 bg-gray-700 dark:bg-gray-600 text-white text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
              >
                刷新状态
              </button>

              {status && (
                <div className="mt-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    总文档数: {status.total_documents}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    已索引: {status.indexed_documents}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    待处理: {status.pending_documents}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
