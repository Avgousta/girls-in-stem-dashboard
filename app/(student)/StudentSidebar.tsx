'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Theme } from './StudentThemeProvider';

interface Props { firstName: string; avatarUrl: string|null; unread: number; accentColor: string; theme: Theme }

const NAV = [
  { href: '/student',              emoji: '🏠', label: 'Home'        },
  { href: '/student/progress',     emoji: '📈', label: 'My Progress' },
  { href: '/student/mentorship',   emoji: '💬', label: 'Mentorship'  },
  { href: '/student/achievements', emoji: '🏆', label: 'Achievements'},
  { href: '/student/support',      emoji: '❤️', label: 'My Support'  },
  { href: '/student/attendance',   emoji: '📅', label: 'Attendance'  },
  { href: '/student/projects',     emoji: '🛠️', label: 'Projects'    },
];

export default function StudentSidebar({ firstName, avatarUrl, unread, accentColor, theme }: Props) {
  const pathname = usePathname();
  const initials = firstName.slice(0,1).toUpperCase();

  const handleLogout = async () => {
    await createClient().auth.signOut();
    window.location.href = '/login';
  };

  return (
    <aside className="w-60 shrink-0 flex flex-col h-full"
      style={{ background: theme.isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.6)', borderRight: `1px solid ${theme.cardBorder}`, backdropFilter: 'blur(20px)' }}>

      {/* Brand */}
      <div className="px-5 pt-6 pb-4" style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0"
            style={{ background: accentColor }}>G</div>
          <div>
            <p className="text-xs font-black" style={{ color: theme.textPrimary }}>Girls in STEM</p>
            <p className="text-[10px] font-medium" style={{ color: theme.textMuted }}>Learning Portal</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="px-3 mb-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>
          Navigation
        </p>
        {NAV.map(({ href, emoji, label }) => {
          const active = pathname === href || (href !== '/student' && pathname.startsWith(href));
          return (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background:  active ? `${accentColor}20` : 'transparent',
                color:       active ? accentColor         : theme.textMuted,
              }}>
              <span className="text-base leading-none" style={{ filter: active ? 'none' : 'grayscale(0.4) opacity(0.7)' }}>
                {emoji}
              </span>
              <span className="flex-1 truncate">{label}</span>
              {href === '/student/support' && unread > 0 && (
                <span className="text-[9px] font-black bg-red-500 text-white rounded-full px-1.5 py-0.5">
                  {unread}
                </span>
              )}
              {active && (
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accentColor }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User block */}
      <div className="p-3" style={{ borderTop: `1px solid ${theme.cardBorder}` }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl group"
          style={{ background: `${accentColor}10` }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={firstName} className="w-8 h-8 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
              style={{ background: `linear-gradient(135deg,${accentColor},${accentColor}88)` }}>
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: theme.textPrimary }}>{firstName}</p>
            <p className="text-[10px]" style={{ color: theme.textMuted }}>Learner</p>
          </div>
          <button onClick={handleLogout} title="Sign out"
            className="text-[10px] font-bold opacity-50 hover:opacity-100 transition-opacity shrink-0"
            style={{ color: theme.textMuted }}>
            Exit
          </button>
        </div>
      </div>
    </aside>
  );
}
