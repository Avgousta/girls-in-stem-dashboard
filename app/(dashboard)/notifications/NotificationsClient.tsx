'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { fmt } from '@/utils';
import { DS } from '@/components/platform/tokens';
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

// Left-border accent colours per type (CSS var or hex)
const TYPE_ACCENT: Record<string, string> = {
  absence:          'var(--ds-danger)',
  low_score:        'var(--ds-warn)',
  intervention:     'var(--ds-warn)',
  risk:             'var(--ds-danger)',
  mentorship:       '#A78BFA',
  project_feedback: '#60A5FA',
  assessment:       'var(--ds-success)',
  meeting:          '#60A5FA',
  default:          DS.border as string,
};

export default function NotificationsClient({ notifications: initial }: { notifications: Notification[] }) {
  const [items,  setItems]  = useState(initial);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

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
        {/* Filter tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: DS.surfaceHover }}>
          {(['all', 'unread'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer capitalize"
              style={filter === f
                ? { background: DS.primary, color: '#fff' }
                : { background: 'transparent', color: DS.textMid as string }}>
              {f === 'unread' ? `Unread (${unreadCount})` : 'All'}
            </button>
          ))}
        </div>

        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-1.5 text-sm font-medium hover:underline cursor-pointer"
            style={{ color: DS.primary }}>
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl"
          style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <Bell className="w-12 h-12 mx-auto mb-3" style={{ color: DS.border }} />
          <p className="text-sm font-medium" style={{ color: DS.textMuted }}>
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => {
            const icon   = TYPE_ICONS[n.type]  ?? TYPE_ICONS.default;
            const accent = TYPE_ACCENT[n.type] ?? TYPE_ACCENT.default;
            return (
              <div
                key={n.notification_id}
                onClick={() => !n.is_read && markRead(n.notification_id)}
                className="flex gap-4 rounded-2xl p-4 transition-colors cursor-pointer"
                style={{
                  background:  n.is_read ? DS.surface as string : `${DS.primaryLight}`,
                  border:      `1px solid ${n.is_read ? DS.border : DS.primaryBorder}`,
                  borderLeft:  `4px solid ${accent}`,
                }}>

                {/* Icon */}
                <div className="text-2xl shrink-0 mt-0.5">{icon}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold"
                      style={{ color: n.is_read ? DS.textMid as string : DS.text as string }}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: DS.primary }} />
                      )}
                      <span className="text-xs" style={{ color: DS.textMuted }}>
                        {fmt.date(n.created_at)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: DS.textMuted }}>{n.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
