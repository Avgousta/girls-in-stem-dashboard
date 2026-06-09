'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fmt } from '@/utils';
import { DS } from '@/components/platform/tokens';
import { CheckCheck, Bell, Trash2, ExternalLink, MailOpen, Mail } from 'lucide-react';

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
  const router = useRouter();
  const [items,  setItems]  = useState(initial);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [busy,   setBusy]   = useState<Record<string, boolean>>({});

  const unreadCount = items.filter(n => !n.is_read).length;
  const filtered    = filter === 'unread' ? items.filter(n => !n.is_read) : items;

  // ── Mark single read/unread ──────────────────────────────────────────────
  const toggleRead = async (n: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    setBusy(p => ({ ...p, [n.notification_id]: true }));
    try {
      const res = await fetch(`/api/v1/notifications/${n.notification_id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ is_read: !n.is_read }),
      });
      if (!res.ok) throw new Error();
      setItems(prev => prev.map(x =>
        x.notification_id === n.notification_id ? { ...x, is_read: !n.is_read } : x
      ));
    } catch {
      toast.error('Could not update notification');
    } finally {
      setBusy(p => ({ ...p, [n.notification_id]: false }));
    }
  };

  // ── Mark all read ────────────────────────────────────────────────────────
  const markAllRead = async () => {
    const res = await fetch('/api/v1/notifications', { method: 'PATCH' });
    if (res.ok) {
      setItems(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    }
  };

  // ── Delete single ────────────────────────────────────────────────────────
  const deleteOne = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBusy(p => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`/api/v1/notifications/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setItems(prev => prev.filter(n => n.notification_id !== id));
      toast.success('Notification deleted');
    } catch {
      toast.error('Could not delete notification');
      setBusy(p => ({ ...p, [id]: false }));
    }
  };

  // ── Delete all read ──────────────────────────────────────────────────────
  const deleteAllRead = async () => {
    const readIds = items.filter(n => n.is_read).map(n => n.notification_id);
    if (!readIds.length) return;
    await Promise.all(readIds.map(id =>
      fetch(`/api/v1/notifications/${id}`, { method: 'DELETE' })
    ));
    setItems(prev => prev.filter(n => !n.is_read));
    toast.success(`${readIds.length} notification${readIds.length !== 1 ? 's' : ''} cleared`);
  };

  // ── Click notification — navigate to learner if linked ──────────────────
  const handleClick = async (n: Notification) => {
    // Mark as read in DB if not already
    if (!n.is_read) {
      await fetch(`/api/v1/notifications/${n.notification_id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ is_read: true }),
      });
      setItems(prev => prev.map(x =>
        x.notification_id === n.notification_id ? { ...x, is_read: true } : x
      ));
    }
    // Navigate to learner profile if linked
    if (n.learner_id) {
      router.push(`/learners/${n.learner_id}`);
    }
  };

  const readCount = items.filter(n => n.is_read).length;

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
              {f === 'unread' ? `Unread (${unreadCount})` : `All (${items.length})`}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-1.5 text-sm font-medium hover:underline cursor-pointer"
              style={{ color: DS.primary }}>
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
          {readCount > 0 && (
            <button onClick={deleteAllRead}
              className="flex items-center gap-1.5 text-sm font-medium hover:underline cursor-pointer"
              style={{ color: 'var(--ds-danger)' }}>
              <Trash2 className="w-4 h-4" /> Clear read ({readCount})
            </button>
          )}
        </div>
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
            const isBusy = busy[n.notification_id];
            return (
              <div
                key={n.notification_id}
                onClick={() => handleClick(n)}
                className="group flex gap-4 rounded-2xl p-4 transition-colors cursor-pointer"
                style={{
                  background: n.is_read ? DS.surface as string : DS.primaryLight as string,
                  border:     `1px solid ${n.is_read ? DS.border : DS.primaryBorder}`,
                  borderLeft: `4px solid ${accent}`,
                  opacity:    isBusy ? 0.6 : 1,
                }}>

                {/* Type icon */}
                <div className="text-2xl shrink-0 mt-0.5">{icon}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold"
                      style={{ color: n.is_read ? DS.textMid as string : DS.text as string }}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: DS.primary }} />
                      )}
                      <span className="text-xs" style={{ color: DS.textMuted }}>
                        {fmt.date(n.created_at)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm mt-0.5 leading-relaxed" style={{ color: DS.textMuted }}>
                    {n.body}
                  </p>

                  {/* Action hints */}
                  <div className="flex items-center gap-3 mt-2">
                    {n.learner_id && (
                      <span className="flex items-center gap-1 text-xs font-medium"
                        style={{ color: DS.primary }}>
                        <ExternalLink className="w-3 h-3" /> View learner
                      </span>
                    )}
                  </div>
                </div>

                {/* Per-notification action buttons — visible on hover */}
                <div className="flex flex-col gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Toggle read/unread */}
                  <button
                    onClick={e => toggleRead(n, e)}
                    title={n.is_read ? 'Mark as unread' : 'Mark as read'}
                    className="p-1.5 rounded-lg cursor-pointer transition-colors"
                    style={{ background: DS.surfaceHover, color: DS.textMuted as string }}>
                    {n.is_read
                      ? <Mail className="w-3.5 h-3.5" />
                      : <MailOpen className="w-3.5 h-3.5" />}
                  </button>
                  {/* Delete */}
                  <button
                    onClick={e => deleteOne(n.notification_id, e)}
                    title="Delete notification" aria-label="Delete notification"
                    className="p-1.5 rounded-lg cursor-pointer transition-colors"
                    style={{ background: 'var(--ds-danger-light)', color: 'var(--ds-danger)' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
