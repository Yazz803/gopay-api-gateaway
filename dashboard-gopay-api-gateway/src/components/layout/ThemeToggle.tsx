'use client';

import React, { useEffect, useState } from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
      const hasDarkClass = document.documentElement.classList.contains('dark');
      setIsDark(hasDarkClass);
    });
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  if (!mounted) {
    return <div className="h-8 w-8" />;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Ganti mode tema"
      className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#383E4A] text-[#EAE6DF] hover:bg-[#4E5666] border border-white/10 dark:bg-[#272C37] dark:hover:bg-[#333946] transition-colors cursor-pointer shadow-xs"
    >
      {isDark ? (
        <FiSun className="h-4 w-4" />
      ) : (
        <FiMoon className="h-4 w-4" />
      )}
    </button>
  );
}
