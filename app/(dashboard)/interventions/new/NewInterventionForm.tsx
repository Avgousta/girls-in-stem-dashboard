'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface Props {
  learners:       Array<{ learner_id:string; full_name:string; school:string }>;
  instructors:    Array<{ user_id:string; full_name:string }>;
  preselectedId?: string;
  currentUserId:  string;
}

const TYPE_OPTIONS = [
  { value:'academic',    label:'📚 Academic',    desc:'Performance or learning difficulty' },
  { value:'attendance',  label:'📅 Attendance',  desc:'Missed sessions or patterns of absence' },
  { value:'behavioural', label:'⚠️ Behavioural', desc:'Conduct or engagement concerns' },
  { value:'personal',    label:'💬 Personal',    desc:'Personal or family circumstances' },
  { value:'technical',   label:'💻 Technical',   desc:'Device, connectivity, or platform issues' },
  { value:'other',       label:'📋 Other',       desc:'Other concerns not listed above' },
];

const PRIORITY_OPTIONS = [
  { value:'low',      label:'Low',      color:'#16A34A', desc:'Monitor — no immediate action needed' },
  { value:'medium',   label:'Medium',   color:'#D97706', desc:'Act within the next 2 weeks' },
  { value:'high',     label:'High',     color:'#EA580C', desc:'Act within the next 3 days' },
  { value:'critical', label:'Critical', color:'#DC2626', desc:'Immediate action required today' },
];

export default function NewInterventionForm({ learners, instructors, preselectedId, currentUserId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    learner_id:       preselectedId || '',
    intervention_type:'academic',
    priority:         'medium',
    reason:           '',
    action_plan:      '',
    action_taken:     '',
    assigned_to:      currentUserId,
    follow_up_date:   '',
    due_date:         '',
    status:           'open',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.learner_id)    { toast.error('Select a learner'); return; }
    if (!form.reason.trim()) { toast.error('Reason is required'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/interventions', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          learner_id:        form.learner_id,
          flagged_by:        currentUserId,
          intervention_type: form.intervention_type,
          priority:          form.priority,
          reason:            form.reason.trim(),
          action_plan:       form.action_plan.trim()  || undefined,
          action_taken:      form.action_taken.trim() || undefined,
          assigned_to:       form.assigned_to         || undefined,
          follow_up_date:    form.follow_up_date       || undefined,
          due_date:          form.due_date             || undefined,
          status:            form.status,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to log intervention');
      toast.success('Intervention logged');
      router.push(preselectedId ? `/learners/${preselectedId}` : '/interventions');
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally { setLoading(false); }
  };

  const selectedPri = PRIORITY_OPTIONS.find(p => p.value === form.priority);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Learner */}
      <div>
        <label className="form-label">Learner <span className="text-red-500">*</span></label>
        <select value={form.learner_id} onChange={e => set('learner_id', e.target.value)}
          className="form-select" disabled={!!preselectedId}>
          <option value="">Select learner…</option>
          {learners.map(l => (
            <option key={l.learner_id} value={l.learner_id}>{l.full_name} — {l.school}</option>
          ))}
        </select>
      </div>

      {/* Type */}
      <div>
        <label className="form-label">Type of Intervention <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TYPE_OPTIONS.map(t => (
            <button key={t.value} type="button" onClick={() => set('intervention_type', t.value)}
              className={`text-left px-3 py-2.5 rounded-xl border-2 text-sm transition-all ${
                form.intervention_type === t.value
                  ? 'border-brand-600 bg-brand-50'
                  : 'border-gray-200 hover:border-brand-300'
              }`}>
              <p className="font-semibold">{t.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Priority */}
      <div>
        <label className="form-label">Priority <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-4 gap-2">
          {PRIORITY_OPTIONS.map(p => (
            <button key={p.value} type="button" onClick={() => set('priority', p.value)}
              className={`px-3 py-2 rounded-xl border-2 text-center text-sm font-semibold transition-all ${
                form.priority === p.value ? 'border-current shadow-sm' : 'border-gray-200 text-gray-500'
              }`}
              style={form.priority === p.value ? { borderColor: p.color, color: p.color, background: p.color + '10' } : {}}>
              {p.label}
            </button>
          ))}
        </div>
        {selectedPri && (
          <p className="text-xs text-gray-400 mt-1.5">💡 {selectedPri.desc}</p>
        )}
      </div>

      {/* Reason */}
      <div>
        <label className="form-label">Reason <span className="text-red-500">*</span></label>
        <textarea value={form.reason} onChange={e => set('reason', e.target.value)}
          rows={3} className="form-input"
          placeholder="Why is this learner being flagged? Be specific about what you've observed." />
      </div>

      {/* Action Plan */}
      <div>
        <label className="form-label">Action Plan</label>
        <textarea value={form.action_plan} onChange={e => set('action_plan', e.target.value)}
          rows={2} className="form-input"
          placeholder="What is the plan to support this learner going forward?" />
      </div>

      {/* Actions already taken */}
      <div>
        <label className="form-label">Actions Already Taken</label>
        <textarea value={form.action_taken} onChange={e => set('action_taken', e.target.value)}
          rows={2} className="form-input"
          placeholder="What has already been done?" />
      </div>

      {/* Assigned + Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="form-label">Assign To</label>
          <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} className="form-select">
            {instructors.map(i => (
              <option key={i.user_id} value={i.user_id}>
                {i.full_name}{i.user_id === currentUserId ? ' (me)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Due Date</label>
          <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} className="form-input" />
        </div>
        <div>
          <label className="form-label">Follow-up Date</label>
          <input type="date" value={form.follow_up_date} onChange={e => set('follow_up_date', e.target.value)} className="form-input" />
        </div>
      </div>

      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
          {loading ? 'Logging…' : 'Log Intervention'}
        </button>
        <Link href={preselectedId ? `/learners/${preselectedId}` : '/interventions'} className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}
