'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Send, Lock, MessageSquare } from 'lucide-react';
import { fmt } from '@/utils';
import { DS } from '@/components/platform/tokens';

interface FeedbackItem {
  feedback_id: string; body: string; is_private: boolean;
  created_at: string; users: { full_name: string; role: string };
}
interface Props {
  projectId: string; feedback: FeedbackItem[];
  currentUserId: string; currentUserName: string; isAdmin: boolean;
}

const ROLE_BG: Record<string, string> = {
  admin: DS.primary as string, instructor: '#2563EB', learner: 'var(--ds-success)',
};

export default function FeedbackThread({ projectId, feedback: initial, currentUserName, isAdmin }: Props) {
  const [items,     setItems]     = useState(initial);
  const [body,      setBody]      = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading,   setLoading]   = useState(false);

  const submit = async () => {
    if (!body.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/feedback`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.trim(), is_private: isPrivate }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setItems(prev => [...prev, {
        ...json.data,
        users: { full_name: currentUserName, role: 'instructor' },
      }]);
      setBody('');
      toast.success('Feedback posted');
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
      <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: DS.text }}>
        <MessageSquare className="w-4 h-4" style={{ color: DS.primary }} />
        Feedback & Comments
        {items.length > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: DS.surfaceHover, color: DS.textMuted }}>{items.length}</span>
        )}
      </h3>

      {items.length === 0 && (
        <p className="text-sm py-4 text-center" style={{ color: DS.textMuted }}>No feedback yet. Be the first to comment.</p>
      )}

      <div className="space-y-3">
        {items.map(f => {
          const initials = f.users?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase();
          const roleBg   = ROLE_BG[f.users?.role] || DS.textMid as string;
          return (
            <div key={f.feedback_id}
              className="flex gap-3 p-3 rounded-xl"
              style={f.is_private
                ? { background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)' }
                : { background: DS.surfaceHover as string, border: `1px solid ${DS.borderLight}` }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: roleBg }}>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-semibold" style={{ color: DS.textMid }}>{f.users?.full_name}</p>
                  {f.is_private && (
                    <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(251,191,36,0.15)', color: '#F59E0B' }}>
                      <Lock className="w-2.5 h-2.5" /> Private
                    </span>
                  )}
                  <span className="text-[10px] ml-auto" style={{ color: DS.textMuted }}>{fmt.date(f.created_at)}</span>
                </div>
                <p className="text-sm mt-1 whitespace-pre-line" style={{ color: DS.text }}>{f.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      {isAdmin && (
        <div className="pt-3 space-y-2" style={{ borderTop: `1px solid ${DS.border}` }}>
          <textarea
            value={body} onChange={e => setBody(e.target.value)}
            rows={3} placeholder="Write feedback for this learner…"
            className="form-input w-full text-sm resize-none"
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) submit(); }}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none" style={{ color: DS.textMuted }}>
              <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)}
                className="rounded" />
              <Lock className="w-3 h-3" /> Private (instructors only)
            </label>
            <button onClick={submit} disabled={loading || !body.trim()} className="btn-primary text-sm py-1.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
