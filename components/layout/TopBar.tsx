'use client';
import { Bell, Search } from 'lucide-react';
import type { User } from '@/types';
import Link from 'next/link';

interface Props { user: User; pendingApprovals?: number; unreadNotifications?: number }

export default function TopBar({ user, pendingApprovals = 0, unreadNotifications = 0 }: Props) {
  const totalAlerts = (user.role === 'admin' ? pendingApprovals : 0) + unreadNotifications;

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-6 gap-4 shrink-0 relative">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search learners, programs…"
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Bell — links to notifications, shows combined badge */}
        <Link href="/notifications"
          className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title={`${totalAlerts} alert${totalAlerts !== 1 ? 's' : ''}`}>
          <Bell className="w-4 h-4 text-gray-500" />
          {totalAlerts > 0 && (
            <>
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping opacity-75" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
            </>
          )}
        </Link>

        {/* Role badge */}
        <span className="hidden sm:inline-flex items-center rounded-full bg-brand-800/10 px-3 py-1 text-xs font-semibold text-brand-800 capitalize">
          {user.role}
        </span>
      </div>

      {/* Admin pending approvals banner */}
      {user.role === 'admin' && pendingApprovals > 0 && (
        <div className="absolute top-14 left-64 right-0 z-20">
          <Link href="/admin/approvals"
            className="flex items-center gap-3 px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm hover:bg-amber-100 transition-colors">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span className="font-semibold">
              {pendingApprovals} new teacher registration{pendingApprovals > 1 ? 's' : ''} waiting for approval
            </span>
            <span className="ml-auto text-xs font-semibold text-amber-600">Review now →</span>
          </Link>
        </div>
      )}
    </header>
  );
}
