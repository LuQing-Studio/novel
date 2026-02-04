import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getCurrentUser } from '@/lib/auth/session';
import WorkbenchClient from './workbench-client';

export default async function WorkbenchPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const { id } = await params;

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#1a1816] transition-colors relative">
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiAvPjwvc3ZnPg==')]" />

      <ThemeToggle />

      <div className="container mx-auto px-4 py-6 max-w-[1400px] relative">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-amber-700 dark:hover:text-amber-500 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回首页
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/techniques"
              className="px-4 py-2 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:border-amber-700 dark:hover:border-amber-500 transition-all"
            >
              技法库
            </Link>
            <Link
              href={`/novels/${id}/knowledge-graph`}
              className="px-4 py-2 bg-purple-700 dark:bg-purple-600 text-white font-medium hover:bg-purple-800 dark:hover:bg-purple-700 transition-colors"
            >
              图谱
            </Link>
            <Link
              href={`/novels/${id}/memory`}
              className="px-4 py-2 bg-amber-700 dark:bg-amber-600 text-white font-medium hover:bg-amber-800 dark:hover:bg-amber-700 transition-colors"
            >
              记忆
            </Link>
          </div>
        </div>

        <WorkbenchClient novelId={id} />
      </div>
    </div>
  );
}

