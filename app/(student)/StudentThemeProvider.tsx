'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface Theme {
  id:          string;
  name:        string;
  emoji:       string;
  bg:          string;
  cardBg:      string;
  cardBorder:  string;
  textPrimary: string;
  textSecond:  string;
  textMuted:   string;
  navBg:       string;
  navBorder:   string;
  headerBg:    string;
  inputBg:     string;
  inputText:   string;
  inputBorder: string;
  accentVar:   string;
  isDark:      boolean;
}

export const THEMES: Theme[] = [
  {
    id: 'space', name: 'Space', emoji: '🌌',
    bg:          'linear-gradient(160deg,#080810 0%,#0d0d1a 50%,#0a0a14 100%)',
    cardBg:      'rgba(255,255,255,0.06)',   cardBorder: 'rgba(255,255,255,0.10)',
    textPrimary: '#ffffff',                  textSecond: 'rgba(255,255,255,0.70)',
    textMuted:   'rgba(255,255,255,0.38)',   navBg:      'rgba(10,10,20,0.95)',
    navBorder:   'rgba(255,255,255,0.08)',   headerBg:   'rgba(8,8,16,0.90)',
    inputBg:     '#ffffff',                  inputText:  '#111827',
    inputBorder: '#e5e7eb',                  accentVar:  '#2DD4A0',
    isDark: true,
  },
  {
    id: 'midnight', name: 'Midnight', emoji: '🌙',
    bg:          'linear-gradient(160deg,#020617 0%,#0f172a 50%,#1e1b4b 100%)',
    cardBg:      'rgba(255,255,255,0.05)',   cardBorder: 'rgba(165,180,252,0.18)',
    textPrimary: '#f1f5f9',                  textSecond: 'rgba(241,245,249,0.70)',
    textMuted:   'rgba(165,180,252,0.60)',   navBg:      'rgba(2,6,23,0.97)',
    navBorder:   'rgba(165,180,252,0.18)',   headerBg:   'rgba(2,6,23,0.93)',
    inputBg:     '#ffffff',                  inputText:  '#111827',
    inputBorder: '#e2e8f0',                  accentVar:  '#818cf8',
    isDark: true,
  },
  {
    id: 'ocean', name: 'Ocean', emoji: '🌊',
    bg:          'linear-gradient(160deg,#0c1445 0%,#0f2060 50%,#1a3080 100%)',
    cardBg:      'rgba(255,255,255,0.07)',   cardBorder: 'rgba(99,179,237,0.22)',
    textPrimary: '#e2e8f0',                  textSecond: 'rgba(226,232,240,0.72)',
    textMuted:   'rgba(148,210,235,0.65)',   navBg:      'rgba(12,20,69,0.97)',
    navBorder:   'rgba(99,179,237,0.22)',    headerBg:   'rgba(12,20,69,0.93)',
    inputBg:     '#ffffff',                  inputText:  '#111827',
    inputBorder: '#e2e8f0',                  accentVar:  '#38bdf8',
    isDark: true,
  },
  {
    id: 'sunrise', name: 'Sunrise', emoji: '🌅',
    bg:          'linear-gradient(160deg,#fff7ed 0%,#fef3c7 50%,#fde68a 100%)',
    cardBg:      'rgba(255,255,255,0.82)',   cardBorder: 'rgba(217,119,6,0.22)',
    textPrimary: '#1c1917',                  textSecond: '#44403c',
    textMuted:   '#78716c',                  navBg:      'rgba(255,255,255,0.96)',
    navBorder:   'rgba(217,119,6,0.22)',     headerBg:   'rgba(255,255,255,0.92)',
    inputBg:     '#ffffff',                  inputText:  '#111827',
    inputBorder: '#d6d3d1',                  accentVar:  '#d97706',
    isDark: false,
  },
  {
    id: 'forest', name: 'Forest', emoji: '🌿',
    bg:          'linear-gradient(160deg,#f0fdf4 0%,#dcfce7 50%,#bbf7d0 100%)',
    cardBg:      'rgba(255,255,255,0.86)',   cardBorder: 'rgba(134,239,172,0.40)',
    textPrimary: '#14532d',                  textSecond: '#166534',
    textMuted:   '#4d7c5e',                  navBg:      'rgba(255,255,255,0.96)',
    navBorder:   'rgba(134,239,172,0.40)',   headerBg:   'rgba(240,253,244,0.96)',
    inputBg:     '#ffffff',                  inputText:  '#111827',
    inputBorder: '#bbf7d0',                  accentVar:  '#16a34a',
    isDark: false,
  },
  {
    id: 'candy', name: 'Candy', emoji: '🍬',
    bg:          'linear-gradient(160deg,#fdf2f8 0%,#fce7f3 50%,#fbcfe8 100%)',
    cardBg:      'rgba(255,255,255,0.88)',   cardBorder: 'rgba(249,168,212,0.50)',
    textPrimary: '#831843',                  textSecond: '#9d174d',
    textMuted:   '#be185d',                  navBg:      'rgba(255,255,255,0.97)',
    navBorder:   'rgba(249,168,212,0.50)',   headerBg:   'rgba(253,242,248,0.96)',
    inputBg:     '#ffffff',                  inputText:  '#111827',
    inputBorder: '#fbcfe8',                  accentVar:  '#ec4899',
    isDark: false,
  },
];

interface ThemeCtx {
  theme:          Theme;
  setThemeId:     (id: string) => void;
  accentColor:    string;
  setAccentColor: (c: string) => void;
}

const Ctx = createContext<ThemeCtx>({
  theme: THEMES[0], setThemeId: () => {},
  accentColor: '#4F2D7F', setAccentColor: () => {},
});

export function useTheme() { return useContext(Ctx); }

export default function StudentThemeProvider({
  children, defaultAccent,
}: { children: ReactNode; defaultAccent: string }) {
  const [themeId,     setThemeIdState]     = useState('space');
  const [accentColor, setAccentColorState] = useState(defaultAccent || '#4F2D7F');
  const [mounted,     setMounted]          = useState(false);

  // Read saved preferences from localStorage on mount
  useEffect(() => {
    const savedTheme  = localStorage.getItem('student_theme');
    const savedAccent = localStorage.getItem('student_accent');
    if (savedTheme && THEMES.find(t => t.id === savedTheme)) setThemeIdState(savedTheme);
    if (savedAccent) setAccentColorState(savedAccent);
    setMounted(true);
  }, []);

  const setThemeId = (id: string) => {
    setThemeIdState(id);
    localStorage.setItem('student_theme', id);
  };

  const setAccentColor = (c: string) => {
    setAccentColorState(c);
    localStorage.setItem('student_accent', c);
  };

  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];

  // Inject CSS custom properties onto :root so ALL child pages
  // can use var(--t-bg), var(--t-text), etc. without importing useTheme
  useEffect(() => {
    if (!mounted) return;
    const r = document.documentElement.style;
    r.setProperty('--t-text',    theme.textPrimary);
    r.setProperty('--t-text2',   theme.textSecond);
    r.setProperty('--t-muted',   theme.textMuted);
    r.setProperty('--t-card',    theme.cardBg);
    r.setProperty('--t-border',  theme.cardBorder);
    r.setProperty('--t-accent',  accentColor);
    r.setProperty('--t-accent2', theme.accentVar);
    r.setProperty('--t-input',   theme.inputBg);
    r.setProperty('--t-itext',   theme.inputText);
  }, [theme, accentColor, mounted]);

  return (
    <Ctx.Provider value={{ theme, setThemeId, accentColor, setAccentColor }}>
      {children}
    </Ctx.Provider>
  );
}
