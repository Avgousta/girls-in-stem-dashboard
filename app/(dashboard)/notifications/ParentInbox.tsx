'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { DS } from '@/components/platform/tokens';
import { MessageSquare, ChevronDown, ChevronRight, Send, Loader2, CheckCircle2, Clock, FileText, AlertCircle } from 'lucide-react';
import { fmt } from '@/utils';

interface ParentMsg {
  message_id:   string;
  message_type: string;
  subject:      string;
  body:         string;
  absence_date: string | null;
  status:       string;
  reply_body:   string | null;
  replied_at:   string | null;
  created_at:   string;
  learners:     { learner_profiles: { first_name: string; last_name: string } | null } | null;
  parent:       { full_name: string; email: string } | null;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  excuse:  <FileText  className="w-3.5 h-3.5" />,
  concern: <AlertCircle className="w-3.5 h-3.5" />,
  general: <MessageSquare className="w-3.5 h-3.5" />,
};

function MessageCard({ msg: initial }: { msg: ParentMsg }) {
  const [msg,     setMsg]     = useState(initial);
  const [open,    setOpen]    = useState(msg.status === 'unread');
  const [reply,   setReply]   = useState('');
  const [saving,  setSaving]  = useState(false);

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/parent/messages/${msg.message_id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply_body: reply }),
      });
      if (!res.ok) throw new Error();
      setMsg(m => ({ ...m, status: 'replied', reply_body: reply, replied_at: new Date().toISOString() }));
      setReply('');
      toast.success('Reply sent to parent');
    } catch {
      toast.error('Could not send reply');
    } finally {
      setSaving(false);
    }
  };

  const learnerName = `${msg.learners?.learner_profiles?.first_name ?? ''} ${msg.learners?.learner_profiles?.last_name ?? ''}`.trim();
  const typeColor = msg.message_type === 'concern' ? 'var(--ds-warn)' : msg.message_type === 'excuse' ? '#7C3AED' : DS.primary as string;

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: DS.surface, border: `1px solid ${msg.status === 'unread' ? 'var(--ds-warn)' : DS.border}` }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer">
        <span style={{ color: typeColor }}>{TYPE_ICONS[msg.message_type]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: DS.text }}>{msg.subject}</p>
          <p className="text-xs" style={{ color: DS.textMuted }}>
            {msg.parent?.full_name ?? 'Parent'} re: {learnerName} · {fmt.date(msg.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1 text-[10px] font-bold"
            style={{ color: msg.status === 'replied' ? 'var(--ds-success)' : 'var(--ds-warn)' }}>
            {msg.status === 'replied' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {msg.status === 'replied' ? 'Replied' : 'Unread'}
          </span>
          {open ? <ChevronDown className="w-4 h-4" style={{ color: DS.textMuted }} />
                : <ChevronRight className="w-4 h-4" style={{ color: DS.textMuted }} />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: `1px solid ${DS.borderLight}` }}>
          <p className="text-sm pt-3 leading-relaxed" style={{ color: DS.textMid }}>{msg.body}</p>

          {msg.reply_body && (
            <div className="rounded-lg p-3"
              style={{ background: 'var(--ds-success-light)', border: '1px solid var(--ds-success)' }}>
              <p className="text-[10px] font-bold mb-1" style={{ color: 'var(--ds-success)' }}>Your reply:</p>
              <p className="text-xs" style={{ color: DS.text }}>{msg.reply_body}</p>
            </div>
          )}

          {msg.status !== 'replied' && (
            <div className="space-y-2">
              <textarea value={reply} onChange={e => setReply(e.target.value)}
                placeholder="Reply to this parent…"
                rows={2} className="form-input w-full text-sm resize-none" />
              <button onClick={sendReply} disabled={saving || !reply.trim()}
                className="flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg cursor-pointer"
                style={{ background: DS.primary, color: '#fff', opacity: saving || !reply.trim() ? 0.6 : 1 }}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send Reply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ParentInbox({ messages: initial }: { messages: unknown[] }) {
  const msgs = initial as ParentMsg[];
  const [filter, setFilter] = useState<'all' | 'unread' | 'excuse'>('all');

  const filtered = msgs.filter(m =>
    filter === 'all'    ? true :
    filter === 'unread' ? m.status === 'unread' :
    filter === 'excuse' ? m.message_type === 'excuse' : true
  );

  const unreadCount = msgs.filter(m => m.status === 'unread').length;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
      <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3"
        style={{ borderBottom: `1px solid ${DS.border}` }}>
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" style={{ color: DS.primary }} />
          <p className="text-sm font-bold" style={{ color: DS.text }}>Parent Messages</p>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--ds-warn-light)', color: 'var(--ds-warn)' }}>
              {unreadCount} unread
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          {(['all', 'unread', 'excuse'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="text-xs font-semibold px-3 py-1 rounded-lg cursor-pointer capitalize"
              style={filter === f
                ? { background: DS.primary, color: '#fff' }
                : { background: DS.surfaceHover, color: DS.textMid }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-2">
        {filtered.length === 0
          ? <p className="text-xs text-center py-4" style={{ color: DS.textMuted }}>No messages.</p>
          : filtered.map(m => <MessageCard key={m.message_id} msg={m} />)
        }
      </div>
    </div>
  );
}
