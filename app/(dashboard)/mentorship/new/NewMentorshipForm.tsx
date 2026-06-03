'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, HeartHandshake } from 'lucide-react';
import Link from 'next/link';

interface Props {
  learners:       Array<{ learner_id:string; full_name:string }>;
  mentors:        Array<{ user_id:string; full_name:string }>;
  preselectedId?: string;
  currentUserId:  string;
}

const SESSION_TYPES = [
  { value:'check_in',         emoji:'💬', label:'Check-in',         desc:'General welfare check' },
  { value:'goal_review',      emoji:'🎯', label:'Goal Review',       desc:'Review and update goals' },
  { value:'academic_support', emoji:'📚', label:'Academic Support',  desc:'Help with coursework' },
  { value:'career',           emoji:'🚀', label:'Career',            desc:'Future aspirations' },
  { value:'pastoral',         emoji:'💛', label:'Pastoral',          desc:'Personal or emotional support' },
  { value:'other',            emoji:'📋', label:'Other',             desc:'' },
];

const MOOD = [
  { v:1, emoji:'😟', label:'Struggling' },
  { v:2, emoji:'😕', label:'Low' },
  { v:3, emoji:'😐', label:'Neutral' },
  { v:4, emoji:'😊', label:'Good' },
  { v:5, emoji:'😄', label:'Great' },
];

export default function NewMentorshipForm({ learners, mentors, preselectedId, currentUserId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    learner_id:       preselectedId || '',
    mentor_id:        currentUserId,
    session_date:     new Date().toISOString().slice(0,10),
    session_type:     'check_in',
    duration_minutes: '60',
    notes:            '',
    next_steps:       '',
    goals_discussed:  '',
    learner_mood:     '',
    outcome:          '',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.learner_id) { toast.error('Select a learner'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/mentorship', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          learner_id:       form.learner_id,
          mentor_id:        form.mentor_id,
          session_date:     form.session_date,
          session_type:     form.session_type,
          duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined,
          notes:            form.notes.trim()           || undefined,
          next_steps:       form.next_steps.trim()       || undefined,
          goals_discussed:  form.goals_discussed.trim()  || undefined,
          learner_mood:     form.learner_mood ? Number(form.learner_mood) : undefined,
          outcome:          form.outcome || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      toast.success('Session logged');
      router.push(preselectedId ? `/learners/${preselectedId}` : '/mentorship');
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Learner <span className="text-red-500">*</span></label>
          <select value={form.learner_id} onChange={e => set('learner_id', e.target.value)}
            className="form-select" disabled={!!preselectedId}>
            <option value="">Select learner…</option>
            {learners.map(l => <option key={l.learner_id} value={l.learner_id}>{l.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Mentor</label>
          <select value={form.mentor_id} onChange={e => set('mentor_id', e.target.value)} className="form-select">
            {mentors.map(m => (
              <option key={m.user_id} value={m.user_id}>
                {m.full_name}{m.user_id === currentUserId ? ' (me)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Session type */}
      <div>
        <label className="form-label">Session Type</label>
        <div className="grid grid-cols-3 gap-2">
          {SESSION_TYPES.map(t => (
            <button key={t.value} type="button" onClick={() => set('session_type', t.value)}
              className={`text-left px-3 py-2 rounded-xl border-2 text-sm transition-all ${
                form.session_type === t.value ? 'border-brand-600 bg-brand-50' : 'border-gray-200 hover:border-brand-300'
              }`}>
              <p className="font-semibold">{t.emoji} {t.label}</p>
              {t.desc && <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Date <span className="text-red-500">*</span></label>
          <input type="date" value={form.session_date} onChange={e => set('session_date', e.target.value)} className="form-input" />
        </div>
        <div>
          <label className="form-label">Duration (min)</label>
          <input type="number" value={form.duration_minutes} onChange={e => set('duration_minutes', e.target.value)}
            className="form-input" min={5} max={480} placeholder="60" />
        </div>
      </div>

      {/* Learner mood */}
      <div>
        <label className="form-label">How did the learner seem?</label>
        <div className="flex gap-2">
          {MOOD.map(m => (
            <button key={m.v} type="button" onClick={() => set('learner_mood', String(m.v))}
              className={`flex-1 py-2 rounded-xl border-2 text-center text-xl transition-all ${
                form.learner_mood === String(m.v) ? 'border-brand-500 bg-brand-50 scale-110' : 'border-gray-200'
              }`}
              title={m.label}>
              {m.emoji}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="form-label">Session Notes</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          rows={2} className="form-input" placeholder="What was discussed?" />
      </div>

      <div>
        <label className="form-label">Goals Discussed</label>
        <textarea value={form.goals_discussed} onChange={e => set('goals_discussed', e.target.value)}
          rows={2} className="form-input" placeholder="Which goals came up?" />
      </div>

      <div>
        <label className="form-label">Next Steps</label>
        <textarea value={form.next_steps} onChange={e => set('next_steps', e.target.value)}
          rows={2} className="form-input" placeholder="What actions before next session?" />
      </div>

      <div>
        <label className="form-label">Session Outcome</label>
        <div className="grid grid-cols-3 gap-2">
          {[['positive','✅ Positive','#16A34A'],['neutral','➖ Neutral','#6B7280'],['needs_follow_up','⚠️ Follow-up','#D97706']].map(([v, l, c]) => (
            <button key={v} type="button" onClick={() => set('outcome', v)}
              className={`py-2 rounded-xl border-2 text-sm font-semibold transition-all ${form.outcome === v ? 'border-current' : 'border-gray-200 text-gray-500'}`}
              style={form.outcome === v ? { borderColor: c, color: c, background: c + '10' } : {}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <HeartHandshake className="w-4 h-4" />}
          {loading ? 'Saving…' : 'Log Session'}
        </button>
        <Link href={preselectedId ? `/learners/${preselectedId}` : '/mentorship'} className="btn-secondary">Cancel</Link>
      </div>
    </form>
  );
}
