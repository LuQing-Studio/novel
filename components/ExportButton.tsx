'use client';

export function ExportButton({ novelId }: { novelId: string }) {
  const handleExport = () => {
    window.open(`/api/novels/${novelId}/export`, '_blank');
  };

  return (
    <button
      onClick={handleExport}
      className="px-6 py-2 bg-green-700 dark:bg-green-600 text-white font-medium hover:bg-green-800 dark:hover:bg-green-700 transition-colors"
    >
      📥 导出 TXT
    </button>
  );
}
