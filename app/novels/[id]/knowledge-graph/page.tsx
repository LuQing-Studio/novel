import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getCurrentUser } from '@/lib/auth/session';
import KnowledgeGraphClient from './KnowledgeGraphClient';

export default async function KnowledgeGraphPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const { id } = await params;

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#1a1816] transition-colors relative">
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiAvPjwvc3ZnPg==')]" />

      <ThemeToggle />

      <div className="container mx-auto px-4 py-8 max-w-6xl relative">
        <div className="flex items-center justify-between mb-8">
          <Link
            href={`/novels/${id}`}
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-amber-700 dark:hover:text-amber-500 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回
          </Link>
          <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-amber-50">
            知识图谱
          </h1>
        </div>

        <KnowledgeGraphClient novelId={id} />
      </div>
    </div>
  );
}
