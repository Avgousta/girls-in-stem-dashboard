'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Theme } from './StudentThemeProvider';

const NAV = [
  { href: '/student',              emoji: '🏠', label: 'Home'     },
  { href: '/student/progress',     emoji: '📈', label: 'Progress' },
  { href: '/student/mentorship',   emoji: '💬', label: 'Mentor'   },
  { href: '/student/achievements', emoji: '🏆', label: 'Badges'   },
  { href: '/student/support',      emoji: '❤️', label: 'Support'  },
];

interface Props { unread: number; theme: Theme; accentColor: string }

export default function StudentNav({ unread, theme, accentColor }: Props) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await createClient().auth.signOut();
    window.location.href = '/login';
  };

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-3 pb-3 z-50">
      <div className="rounded-2xl px-2 py-2 flex items-center justify-around"
        style={{
          background:    theme.navBg,
          backdropFilter:'blur(24px)',
          border:        `1px solid ${theme.navBorder}`,
          boxShadow:     theme.isDark ? '0 -4px 30px rgba(0,0,0,0.4)' : '0 -4px 20px rgba(0,0,0,0.08)',
          transition:    'background 0.3s, border-color 0.3s',
        }}>
        {NAV.map(({ href, emoji, label }) => {
          const active = pathname === href || (href !== '/student' && pathname.startsWith(href));
          return (
            <Link key={href} href={href}
              className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200"
              style={{ background: active ? `${accentColor}20` : 'transparent' }}>
              <span className="text-xl leading-none transition-all"
                style={{ filter: active ? 'none' : 'grayscale(0.5) opacity(0.5)' }}>
                {emoji}
              </span>
              <span className="text-[9px] font-bold tracking-wide transition-colors"
                style={{ color: active ? accentColor : theme.textMuted }}>
                {label}
              </span>
              {active && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full"
                  style={{ background: accentColor }} />
              )}
            </Link>
          );
        })}
        <button onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-opacity hover:opacity-60"
          style={{ opacity: 0.35 }}>
          <span className="text-xl leading-none">🚪</span>
          <span className="text-[9px] font-bold tracking-wide" style={{ color: theme.textMuted }}>Out</span>
        </button>
      </div>
    </nav>
  );
}
