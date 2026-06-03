'use client';
import { useState } from 'react';
import { useTheme } from './StudentThemeProvider';
import StudentNav from './StudentNav';
import StudentSidebar from './StudentSidebar';
import Link from 'next/link';

interface Props {
  children:  React.ReactNode;
  firstName: string;
  avatarUrl: string | null;
  unread:    number;
}

export default function StudentShell({ children, firstName, avatarUrl, unread }: Props) {
  const { theme, accentColor } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initials = firstName.slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen" style={{
      background: theme.bg,
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      transition: 'background 0.4s ease',
    }}>

      {/* Ambient blobs — dark themes only */}
      {theme.isDark && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-0">
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.12] blur-[80px]"
            style={{ background: accentColor }} />
          <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full opacity-[0.07] blur-[60px]"
            style={{ background: theme.accentVar }} />
          <div className="absolute -bottom-20 left-1/3 w-96 h-96 rounded-full opacity-[0.06] blur-[80px]"
            style={{ background: accentColor }} />
        </div>
      )}

      {/* ── DESKTOP LAYOUT (md+) ── */}
      <div className="relative hidden md:flex h-screen overflow-hidden">
        {/* Sidebar */}
        <StudentSidebar firstName={firstName} avatarUrl={avatarUrl} unread={unread} accentColor={accentColor} theme={theme} />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Desktop topbar */}
          <header className="shrink-0 flex items-center justify-between px-8 py-4"
            style={{ borderBottom: `1px solid ${theme.cardBorder}`, background: theme.headerBg, backdropFilter: 'blur(20px)' }}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: theme.textMuted }}>
                Girls in STEM
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/student/notifications"
                className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                <span className="text-base">🔔</span>
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
              <Link href="/student/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all hover:scale-[1.02]"
                style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={firstName} className="w-6 h-6 rounded-lg object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-black"
                    style={{ background: `linear-gradient(135deg,${accentColor},${theme.accentVar})` }}>
                    {initials}
                  </div>
                )}
                <span className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{firstName}</span>
              </Link>
            </div>
          </header>

          {/* Scrollable page content */}
          <main className="flex-1 overflow-y-auto px-8 py-6">
            {children}
          </main>
        </div>
      </div>

      {/* ── MOBILE LAYOUT (< md) ── */}
      <div className="relative flex flex-col min-h-screen md:hidden">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 px-4 pt-3 pb-2"
          style={{ background: theme.headerBg, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${theme.navBorder}` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={firstName}
                    className="w-9 h-9 rounded-2xl object-cover"
                    style={{ border: `2px solid ${accentColor}50` }} />
                ) : (
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-white text-sm font-black"
                    style={{ background: `linear-gradient(135deg,${accentColor},${theme.accentVar})` }}>
                    {initials}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full"
                  style={{ border: `2px solid ${theme.isDark ? '#080810' : '#fff'}` }} />
              </div>
              <div>
                <p className="text-xs font-medium leading-none" style={{ color: theme.textMuted }}>Welcome back</p>
                <p className="text-sm font-bold leading-tight" style={{ color: theme.textPrimary }}>{firstName} ✨</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/student/notifications"
                className="relative w-9 h-9 rounded-2xl flex items-center justify-center"
                style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                <span className="text-base">🔔</span>
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
              <Link href="/student/profile"
                className="w-9 h-9 rounded-2xl flex items-center justify-center"
                style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                <span className="text-base">⚙️</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Mobile content */}
        <main className="flex-1 px-4 pb-28 pt-3">
          {children}
        </main>

        <StudentNav unread={unread} theme={theme} accentColor={accentColor} />
      </div>
    </div>
  );
}
