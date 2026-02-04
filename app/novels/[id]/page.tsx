import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';

export default async function NovelPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const { id } = await params;
  redirect(`/novels/${id}/workbench`);
}

