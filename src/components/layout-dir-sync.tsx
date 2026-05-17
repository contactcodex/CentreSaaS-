'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/store';

/**
 * Sets <html dir="rtl|ltr" lang="ar|fr"> dynamically based on current language.
 * Wrap inside <body> in layout.tsx.
 */
export function LayoutDirSync() {
  const lang = useAppStore((s) => s.lang);

  useEffect(() => {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  return null;
}
