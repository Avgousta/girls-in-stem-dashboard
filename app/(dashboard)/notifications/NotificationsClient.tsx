'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/utils';
import { fmt } from '@/utils';
import { CheckCheck, Bell } from 'lucide-react';

interface Notification {
  notification_id: string;
  type:            string;
  title:           string;
  body:            string;
  is_read:         boolean;
  created_at:      string;
  learner_id:      string | null;
}

const TYPE_ICONS: Record<string, string> = {
  absence:          '🚫',
  low_score:        '📉',
  intervention:     '⚠️',
  risk:             '🔴',
  mentorship:       '💬',
  project_feedback: '💡',
  assessment:       '📝',
  meeting:          '📅',
  default:          '🔔',
};

const TYPE_COLORS: Record<string, string> = {
  absence:          'border-l-red-500',
  low_score:        'border-l-orange-500',
  intervention:     'border-l-amber-500',
  risk:             'border-l-red-600',
  mentorship:       'border-l-purple-500',
  project_feedback: 'border-l-blue-500',
  assessment:       'border-l-mint-500',
  default:          'border-l-gray-300',
};

export default function NotificationsClient({ notifications: initial }: { notifications: Notification[] }) {
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<'all'|'unread'>('all');

  const unreadCount = items.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    await fetch('/api/v1/notifications', { method: 'PATCH' });
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success('All notifications marked as read');
  };

  const markRead = (id: string) => {
    setItems(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n));
  };

  const filtered = filter === 'unread' ? items.filter(n => !n.is_read) : items;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['all','unread'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-4 py-1.5 rounded text-sm font-medium transition-all capitalize',
                filter === f ? 'bg-white shadow-sm text-brand-700' : 'text-gray-500 hover:text-gray-700')}>
              {f === 'unread' ? `Unread (${unreadCount})` : 'All'}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-1.5 text-sm text-brand-700 hover:underline font-medium">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {/* Notifications list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
          <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => {
            const icon  = TYPE_ICONS[n.type]  || TYPE_ICONS.default;
            const color = TYPE_COLORS[n.type] || TYPE_COLORS.default;
            return (
              <div key={n.notification_id}
                onClick={() => !n.is_read && markRead(n.notification_id)}
                className={cn(
                  'bg-white rounded-xl border border-gray-100 shadow-sm p-4 border-l-4 flex gap-4 cursor-pointer transition-all',
                  color,
                  !n.is_read ? 'bg-brand-50/30 hover:bg-brand-50' : 'hover:bg-gray-50',
                )}>
                <div className="text-2xl shrink-0 mt-0.5">{icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn('text-sm font-semibold', !n.is_read ? 'text-gray-900' : 'text-gray-700')}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0" />
                      )}
                      <span className="text-xs text-gray-400">{fmt.date(n.created_at)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{n.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
