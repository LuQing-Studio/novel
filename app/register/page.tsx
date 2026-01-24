'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (formData.password.length < 8) {
      setError('密码至少 8 位');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error || '注册失败');
        return;
      }

      router.push('/');
      router.refresh();
    } catch (e) {
      console.error(e);
      setError('注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#1a1816] transition-colors relative">
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiAvPjwvc3ZnPg==')]" />

      <ThemeToggle />

      <div className="container mx-auto px-4 py-12 max-w-md relative">
        <header className="mb-10 text-center">
          <h1 className="text-5xl font-serif font-bold text-gray-900 dark:text-amber-50 mb-3 tracking-tight">
            Novel.AI
          </h1>
          <p className="text-gray-700 dark:text-gray-300">
            创建账号，开启长期一致性写作
          </p>
        </header>

        <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 dark:text-amber-50 mb-6 border-b-2 border-amber-700/20 dark:border-amber-500/20 pb-4">
            注册
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                邮箱
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-amber-700 dark:focus:border-amber-500 outline-none transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                密码
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-amber-700 dark:focus:border-amber-500 outline-none transition-colors"
                placeholder="至少 8 位"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                确认密码
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-amber-700 dark:focus:border-amber-500 outline-none transition-colors"
                placeholder="再次输入密码"
              />
            </div>

            {error && (
              <div className="p-3 border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-amber-700 dark:bg-amber-600 text-white font-medium border-2 border-amber-900 dark:border-amber-700 hover:bg-amber-800 dark:hover:bg-amber-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {loading ? '注册中...' : '注册并登录'}
            </button>

            <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
              已有账号？{' '}
              <Link href="/login" className="text-amber-700 dark:text-amber-500 hover:underline">
                去登录
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
