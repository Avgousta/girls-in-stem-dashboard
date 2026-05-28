'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, BookOpen, CalendarCheck2, BarChart3,
  HeartHandshake, AlertTriangle, FolderKanban, School, Settings,
  GraduationCap, ChevronRight, LogOut, UserCheck, Award, FileText, Bell
} from 'lucide-react';
import { cn } from '@/utils';
import type { User, UserRole } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',     href: '/dashboard',      icon: LayoutDashboard, roles: ['admin','instructor'] },
  { label: 'Learners',      href: '/learners',        icon: Users,           roles: ['admin','instructor'] },
  { label: 'Programs',      href: '/programs',        icon: BookOpen,        roles: ['admin','instructor'] },
  { label: 'Attendance',    href: '/attendance',      icon: CalendarCheck2,  roles: ['admin','instructor'] },
  { label: 'Assessments',   href: '/assessments',     icon: BarChart3,       roles: ['admin','instructor'] },
  { label: 'Projects',      href: '/projects',        icon: FolderKanban,    roles: ['admin','instructor'] },
  { label: 'Mentorship',    href: '/mentorship',      icon: HeartHandshake,  roles: ['admin','instructor'] },
  { label: 'Interventions', href: '/interventions',   icon: AlertTriangle,   roles: ['admin','instructor'] },
  { label: 'Risk Monitor',  href: '/risk',            icon: AlertTriangle,   roles: ['admin','instructor'] },
  { label: 'Reports',       href: '/reports',         icon: FileText,        roles: ['admin','instructor'] },
  { label: 'Notifications', href: '/notifications',   icon: Bell,            roles: ['admin','instructor'] },
  { label: 'Schools',       href: '/admin/schools',   icon: School,          roles: ['admin'] },
  { label: 'Users',         href: '/admin/users',     icon: Settings,        roles: ['admin'] },
  { label: 'Approvals',     href: '/admin/approvals', icon: UserCheck,       roles: ['admin'] },
  { label: 'Sponsors',      href: '/admin/sponsors',  icon: Award,           roles: ['admin'] },
  // Learner portal
  { label: 'My Progress',   href: '/learner',         icon: LayoutDashboard, roles: ['learner'] },
  { label: 'My Attendance', href: '/learner/attendance', icon: CalendarCheck2, roles: ['learner'] },
  { label: 'My Scores',     href: '/learner/scores',  icon: BarChart3,       roles: ['learner'] },
  // Parent portal
  { label: "Child's Progress", href: '/parent',       icon: LayoutDashboard, roles: ['parent'] },
];

interface Props { user: User; pendingApprovals?: number; unreadNotifications?: number }

export default function SidebarNavigation({ user, pendingApprovals = 0, unreadNotifications = 0 }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const filtered = NAV_ITEMS.filter(item => item.roles.includes(user.role));

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className="flex flex-col w-64 bg-white border-r border-gray-100 h-full shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-800 to-mint-400 flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-gray-900 text-sm leading-tight truncate">Girls in STEM</p>
          <p className="text-xs text-gray-400 truncate">Digital Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {/* Section label */}
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          {user.role === 'admin' ? 'Administration' : user.role === 'instructor' ? 'Instructor' : 'My Portal'}
        </p>

        {filtered.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon   = item.icon;
          const badge  = item.href === '/admin/approvals'
            ? pendingApprovals
            : item.href === '/notifications'
              ? unreadNotifications
              : (item.badge || 0);
          return (
            <Link key={item.href} href={item.href}
              className={cn('sidebar-link', active && 'active')}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {badge > 0 ? (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {badge > 99 ? '99+' : badge}
                </span>
              ) : active ? (
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-brand-800 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{user.full_name}</p>
            <p className="text-xs text-gray-400 capitalize">{user.role}</p>
          </div>
          <button onClick={handleLogout} className="opacity-0 group-hover:opacity-100 transition-opacity">
            <LogOut className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
      </div>
    </aside>
  );
}
