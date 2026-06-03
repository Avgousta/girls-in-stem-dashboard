'use client';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: 'dark', toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start with dark — the blocking script in layout.tsx already set the correct
  // attribute on <html> before hydration, so no flash occurs.
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    // Sync React state with whatever the blocking script already set
    const current = document.documentElement.getAttribute('data-theme') as Theme | null;
    if (current) setTheme(current);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('girls-stem-theme', next); } catch { /* ignore */ }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
