'use client';

export function ExportChapterButton({
  novelId,
  chapterId,
}: {
  novelId: string;
  chapterId: string;
}) {
  const handleExport = () => {
    const params = new URLSearchParams();
    params.set('chapterIds', chapterId);
    window.open(`/api/novels/${novelId}/export?${params.toString()}`, '_blank');
  };

  return (
    <button
      onClick={handleExport}
      className="px-6 py-2 bg-green-700 dark:bg-green-600 text-white font-medium hover:bg-green-800 dark:hover:bg-green-700 transition-colors"
    >
      📥 导出本章
    </button>
  );
}

