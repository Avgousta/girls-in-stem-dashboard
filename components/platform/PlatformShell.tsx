'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/ThemeProvider';
import {
  LayoutDashboard, Users, BookOpen, CalendarCheck2, BarChart3,
  HeartHandshake, AlertTriangle, FolderKanban, School, Settings,
  GraduationCap, LogOut, UserCheck, Award, FileText, Bell, Video,
  ChevronDown, Menu, X, TrendingUp, Building2, ShieldCheck, Activity,
  Sun, Moon,
} from 'lucide-react';

// ─── Design tokens (shared across all portals) ───────────────────────────────
import { DS } from './tokens';

// ─── Role-specific nav config ─────────────────────────────────────────────────
type NavItem = { label: string; href: string; icon: React.ElementType; section?: string; badge?: string }

const ADMIN_NAV: NavItem[] = [
  { section: 'Overview', label: 'Dashboard',      href: '/dashboard',       icon: LayoutDashboard },
  { label: 'Analytics',                           href: '/reports',          icon: Activity },
  { section: 'Learners & Staff', label: 'Learners', href: '/learners',       icon: Users },
  { label: 'Risk Monitor',                        href: '/risk',             icon: TrendingUp },
  { label: 'Interventions',                       href: '/interventions',    icon: AlertTriangle },
  { label: 'Mentorship',                          href: '/mentorship',       icon: HeartHandshake },
  { section: 'Programmes', label: 'Programmes',   href: '/programs',         icon: BookOpen },
  { label: 'Attendance',                          href: '/attendance',       icon: CalendarCheck2 },
  { label: 'Assessments',                         href: '/assessments',      icon: BarChart3 },
  { label: 'Projects',                            href: '/projects',         icon: FolderKanban },
  { section: 'Administration', label: 'Users',    href: '/admin/users',            icon: Settings },
  { label: 'Approvals',                           href: '/admin/approvals',        icon: UserCheck,    badge: 'approvals' },
  { label: 'Sponsors',                            href: '/admin/sponsors',         icon: Award },
  { label: 'Schools',                             href: '/admin/schools',          icon: School },
  { label: 'Learner Access',                      href: '/admin/learner-access',   icon: GraduationCap },
  { label: 'Notifications',                       href: '/notifications',          icon: Bell,         badge: 'notifications' },
];

const INSTRUCTOR_NAV: NavItem[] = [
  { section: 'Overview',   label: 'Dashboard',    href: '/teacher',          icon: LayoutDashboard },
  { section: 'Teaching',   label: 'My Learners',  href: '/teacher/learners', icon: Users },
  { label: 'Online Classes',                      href: '/teacher/meetings', icon: Video },
  { label: 'Attendance',                          href: '/attendance',       icon: CalendarCheck2 },
  { label: 'Assessments',                         href: '/teacher/assessments', icon: BarChart3 },
  { section: 'Support',    label: 'Interventions',href: '/interventions',    icon: AlertTriangle,  badge: 'interventions' },
  { label: 'Mentorship',                          href: '/mentorship',       icon: HeartHandshake },
  { label: 'Projects',                            href: '/projects',         icon: FolderKanban },
  { label: 'Notifications',                       href: '/notifications',    icon: Bell,            badge: 'notifications' },
];

interface Props {
  children:             React.ReactNode;
  role:                 'admin' | 'instructor';
  userName:             string;
  pendingApprovals?:    number;
  unreadNotifications?: number;
  openInterventions?:   number;
}

export default function PlatformShell({
  children, role, userName,
  pendingApprovals = 0, unreadNotifications = 0, openInterventions = 0,
}: Props) {
  const pathname  = usePathname();
  const router    = useRouter();
  const { theme, toggle: toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const nav = role === 'admin' ? ADMIN_NAV : INSTRUCTOR_NAV;

  const handleLogout = async () => {
    await createClient().auth.signOut();
    router.push('/login');
  };

  const getBadgeCount = (badge?: string) => {
    if (!badge) return 0;
    if (badge === 'approvals')     return pendingApprovals;
    if (badge === 'notifications') return unreadNotifications;
    if (badge === 'interventions') return openInterventions;
    return 0;
  };

  const initials = userName.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
  const roleLabel = role === 'admin' ? 'Administrator' : 'Instructor';
  const roleColor = role === 'admin' ? DS.primary : '#34D399';

  // Sidebar content (shared between mobile drawer + desktop)
  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: DS.sidebar }}>

      {/* Brand */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: DS.primary }}>
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Girls in STEM</p>
            <p className="text-xs leading-none mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {roleLabel} Portal
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {nav.map((item, i) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/teacher' && pathname.startsWith(item.href));
          const badge    = getBadgeCount(item.badge);
          const Icon     = item.icon;

          return (
            <div key={item.href}>
              {item.section && (
                <p className="px-3 pt-4 pb-1.5 text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {item.section}
                </p>
              )}
              <Link href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 group"
                style={{
                  background:  isActive ? 'rgba(124,58,237,0.18)' : 'transparent',
                  color:       isActive ? '#C4B5FD' : 'rgba(255,255,255,0.55)',
                }}>
                <Icon className="w-4 h-4 shrink-0 transition-colors"
                  style={{ color: isActive ? '#A78BFA' : 'rgba(255,255,255,0.35)' }} />
                <span className="flex-1 truncate">{item.label}</span>
                {badge > 0 && (
                  <span className="text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
                    style={{ background: item.badge === 'interventions' ? DS.warn : '#EF4444', color: 'white' }}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* User block */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
            style={{ background: roleColor }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{userName}</p>
            <p className="text-[11px] capitalize" style={{ color: 'rgba(255,255,255,0.4)' }}>{roleLabel}</p>
          </div>
          <button onClick={handleLogout} title="Sign out"
            className="p-1 rounded-lg transition-colors hover:bg-white/10">
            <LogOut className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.35)' }} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: DS.bg, fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif" }}>

      {/* Skip to main content — visible on keyboard focus */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — desktop always visible, mobile as drawer */}
      <aside className={`fixed md:relative z-50 md:z-auto flex flex-col w-60 h-full shrink-0 transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="h-14 shrink-0 flex items-center px-5 gap-4"
          style={{ background: DS.surface, borderBottom: `1px solid ${DS.border}` }}>

          {/* Mobile menu button */}
          <button onClick={() => setSidebarOpen(p => !p)} className="md:hidden p-1.5 rounded-lg hover:bg-white/10">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Breadcrumb / context */}
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <span className="font-semibold" style={{ color: DS.textMid }}>{roleLabel}</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-xl transition-all duration-200 cursor-pointer"
              style={{ color: DS.textMid, background: 'transparent' }}
              onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-surface-hover)'; }}
              onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4" />
                : <Moon className="w-4 h-4" />
              }
            </button>

            {/* Notification bell */}
            <Link href={role === 'admin' ? '/notifications' : '/notifications'}
              className="relative p-2 rounded-xl transition-colors hover:bg-white/8"
              title="Notifications">
              <Bell className="w-4 h-4" style={{ color: DS.textMid }} />
              {(unreadNotifications + (role === 'admin' ? pendingApprovals : 0)) > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
              )}
            </Link>

            {/* Role chip */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold"
              style={role === 'admin'
                ? { background: 'rgba(124,58,237,0.2)', color: '#C4B5FD' }
                : { background: 'rgba(52,211,153,0.15)', color: '#34D399' }}>
              {role === 'admin' ? <ShieldCheck className="w-3.5 h-3.5" /> : <GraduationCap className="w-3.5 h-3.5" />}
              {roleLabel}
            </div>

            {/* User name */}
            <div className="hidden md:flex items-center gap-2 pl-3"
              style={{ borderLeft: `1px solid ${DS.border}` }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black"
                style={{ background: roleColor }}>
                {initials}
              </div>
              <span className="text-sm font-medium" style={{ color: DS.textMid }}>
                {userName.split(' ')[0]}
              </span>
            </div>
          </div>
        </header>

        {/* Pending approvals banner */}
        {role === 'admin' && pendingApprovals > 0 && (
          <Link href="/admin/approvals"
            className="flex items-center gap-3 px-6 py-2.5 text-sm transition-colors hover:opacity-90"
            style={{ background: 'rgba(251,191,36,0.12)', borderBottom: '1px solid rgba(251,191,36,0.2)', color: '#FCD34D' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: DS.warn }} />
            <span className="font-semibold">
              {pendingApprovals} teacher registration{pendingApprovals > 1 ? 's' : ''} waiting for approval
            </span>
            <span className="ml-auto text-xs font-bold" style={{ color: DS.warn }}>Review now →</span>
          </Link>
        )}

        {/* Page content */}
        <main id="main-content" className="flex-1 overflow-y-auto px-6 py-6"
          tabIndex={-1} aria-label="Main content">
          {children}
        </main>
      </div>
    </div>
  );
}
