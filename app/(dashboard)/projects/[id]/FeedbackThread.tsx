'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Send, Lock, MessageSquare } from 'lucide-react';
import { fmt } from '@/utils';
import { cn } from '@/utils';

interface FeedbackItem {
  feedback_id: string; body: string; is_private: boolean;
  created_at: string; users: { full_name: string; role: string };
}
interface Props {
  projectId: string; feedback: FeedbackItem[];
  currentUserId: string; currentUserName: string; isAdmin: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-brand-700', instructor: 'bg-blue-600', learner: 'bg-mint-500',
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
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-brand-700" />
        Feedback & Comments
        {items.length > 0 && (
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{items.length}</span>
        )}
      </h3>

      {items.length === 0 && (
        <p className="text-sm text-gray-400 py-4 text-center">No feedback yet. Be the first to comment.</p>
      )}

      <div className="space-y-3">
        {items.map(f => {
          const initials = f.users?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase();
          const roleColor = ROLE_COLORS[f.users?.role] || 'bg-gray-500';
          return (
            <div key={f.feedback_id}
              className={cn('flex gap-3 p-3 rounded-xl', f.is_private ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50')}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${roleColor}`}>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-semibold text-gray-700">{f.users?.full_name}</p>
                  {f.is_private && (
                    <span className="flex items-center gap-0.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                      <Lock className="w-2.5 h-2.5" /> Private
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400 ml-auto">{fmt.date(f.created_at)}</span>
                </div>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">{f.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Post feedback */}
      {isAdmin && (
        <div className="pt-3 border-t border-gray-100 space-y-2">
          <textarea
            value={body} onChange={e => setBody(e.target.value)}
            rows={3} placeholder="Write feedback for this learner…"
            className="form-input w-full text-sm resize-none"
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) submit(); }}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
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
