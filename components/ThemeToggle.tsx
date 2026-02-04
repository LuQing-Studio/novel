'use client';

import { useEffect, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';

const THEME_EVENT = 'novel-theme-change';

function readTheme(): Theme {
  if (typeof window === 'undefined') return 'light';

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return isDark ? 'dark' : 'light';
}

function subscribeTheme(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const onChange = () => callback();

  window.addEventListener('storage', onChange);
  window.addEventListener(THEME_EVENT, onChange);

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', onChange);
  } else {
    // Safari < 14
    mq.addListener(onChange);
  }

  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(THEME_EVENT, onChange);
    if (typeof mq.removeEventListener === 'function') {
      mq.removeEventListener('change', onChange);
    } else {
      mq.removeListener(onChange);
    }
  };
}

export function ThemeToggle() {
  // useSyncExternalStore ensures SSR + hydration use the same snapshot (no mismatch),
  // then updates to the real client value after hydration.
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => 'light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-6 right-6 z-50 p-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all hover:scale-110"
      aria-label="切换主题"
    >
      {theme === 'light' ? (
        <svg className="w-5 h-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )}
    </button>
  );
}
