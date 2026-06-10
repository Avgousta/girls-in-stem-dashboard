'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Loader2, AlertTriangle, BookOpen, CalendarCheck2,
  AlertOctagon, MessageCircle, Monitor, FileText, Wand2, ChevronDown, ChevronUp, Search, X,
} from 'lucide-react';
import Link from 'next/link';
import { DS } from '@/components/platform/tokens';

// ─── Intervention Templates ───────────────────────────────────────────────────
const TEMPLATES = [
  {
    label: 'Academic Underperformance — First Warning',
    type: 'academic', priority: 'medium',
    reason: 'Learner\'s assessment scores have dropped below 50% across two consecutive assessments. Current average score is below the programme threshold.',
    action_plan: '1. One-on-one academic support session within 3 days\n2. Review areas of difficulty with instructor\n3. Create a personalised study plan\n4. Follow up in 2 weeks to assess improvement',
  },
  {
    label: 'Chronic Absenteeism',
    type: 'attendance', priority: 'high',
    reason: 'Learner has missed 3 or more consecutive sessions without communication. Attendance rate has dropped below 75%, putting programme standing at risk.',
    action_plan: '1. Contact learner and guardian/parent within 24 hours\n2. Understand the cause of absences\n3. Create an attendance improvement plan\n4. Schedule catch-up sessions for missed content',
  },
  {
    label: 'Engagement Drop — At Risk of Disengagement',
    type: 'personal', priority: 'medium',
    reason: 'Learner has shown a marked decline in participation, assignment submission, and engagement with platform activities. Mentor has flagged concern.',
    action_plan: '1. Empathetic one-on-one check-in (non-academic focus)\n2. Identify barriers — personal, family, or technical\n3. Connect with mentor for additional support\n4. Review workload and adjust expectations if needed',
  },
  {
    label: 'Critical Academic Failure — Immediate Support',
    type: 'academic', priority: 'critical',
    reason: 'Learner is failing all assessed areas with scores below 40%. Without immediate intervention, learner is at risk of programme dismissal.',
    action_plan: '1. Emergency support session today or tomorrow\n2. Notify programme coordinator\n3. Develop an intensive remediation plan\n4. Daily check-ins for the next 2 weeks\n5. Consider reducing workload while rebuilding fundamentals',
  },
  {
    label: 'Technical Barrier — Device or Connectivity',
    type: 'technical', priority: 'medium',
    reason: 'Learner has reported persistent issues accessing the platform due to device failure or unreliable internet connectivity. This is impacting participation.',
    action_plan: '1. Assess the specific technical issue\n2. Coordinate with programme office for device/data support\n3. Provide offline alternatives where possible\n4. Follow up within 5 days to confirm resolution',
  },
  {
    label: 'Behavioural Concern — Peer or Instructor Conflict',
    type: 'behavioural', priority: 'high',
    reason: 'Learner has had a reported conflict with a peer or instructor that is impacting their and others\' learning environment. Situation requires structured follow-up.',
    action_plan: '1. Private meeting with learner to hear their perspective\n2. Mediation session with all parties if appropriate\n3. Set clear behavioural expectations going forward\n4. Monitor for 2 weeks; escalate if behaviour continues',
  },
] as const;

// ─── Custom dark-mode learner combobox ───────────────────────────────────────
function LearnerCombobox({
  learners, value, onChange, disabled,
}: {
  learners: Array<{ learner_id: string; full_name: string; school: string }>;
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const ref                   = useRef<HTMLDivElement>(null);

  const selected = learners.find(l => l.learner_id === value);

  const filtered = query.trim()
    ? learners.filter(l =>
        l.full_name.toLowerCase().includes(query.toLowerCase()) ||
        l.school.toLowerCase().includes(query.toLowerCase())
      )
    : learners;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const containerSt: React.CSSProperties = {
    background: DS.surfaceHover as string,
    border: `1px solid ${open ? DS.primary : DS.border}`,
    borderRadius: '12px',
    padding: '10px 14px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    opacity: disabled ? 0.6 : 1,
    transition: 'border-color 0.15s',
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <div style={containerSt} onClick={() => !disabled && setOpen(o => !o)}
        role="combobox" aria-expanded={open} aria-haspopup="listbox" tabIndex={disabled ? -1 : 0}
        onKeyDown={e => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) setOpen(o => !o); }}>
        <span className="text-sm truncate" style={{ color: selected ? DS.text as string : DS.textMuted as string }}>
          {selected ? `${selected.full_name} — ${selected.school}` : 'Select learner…'}
        </span>
        {open ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: DS.textMuted }} />
               : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: DS.textMuted }} />}
      </div>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-xl"
          style={{ background: DS.surface as string, border: `1px solid ${DS.border}`, maxHeight: '320px', display: 'flex', flexDirection: 'column' }}>
          {/* Search */}
          <div className="p-2 border-b" style={{ borderColor: DS.border }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: DS.textMuted }} />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search name or school…"
                className="w-full text-sm pl-8 pr-8 py-1.5 rounded-lg outline-none"
                style={{ background: DS.surfaceHover as string, color: DS.text as string, border: `1px solid ${DS.border}` }}
              />
              {query && (
                <button aria-label="Clear search" onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: DS.textMuted }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          {/* Options */}
          <div className="overflow-y-auto" role="listbox">
            {filtered.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: DS.textMuted }}>No learners found</p>
            ) : filtered.map(l => (
              <div key={l.learner_id} role="option" aria-selected={l.learner_id === value}
                onClick={() => { onChange(l.learner_id); setOpen(false); setQuery(''); }}
                className="px-4 py-2.5 cursor-pointer transition-colors text-sm"
                style={{
                  background: l.learner_id === value ? DS.primaryLight as string : 'transparent',
                  color: l.learner_id === value ? DS.primary as string : DS.text as string,
                }}
                onMouseOver={e => { if (l.learner_id !== value) (e.currentTarget as HTMLDivElement).style.background = DS.surfaceHover as string; }}
                onMouseOut={e =>  { if (l.learner_id !== value) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
                <span className="font-medium">{l.full_name}</span>
                <span className="text-xs ml-1.5" style={{ color: DS.textMuted }}>— {l.school}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  learners:       Array<{ learner_id:string; full_name:string; school:string }>;
  instructors:    Array<{ user_id:string; full_name:string }>;
  preselectedId?: string;
  currentUserId:  string;
}

const TYPE_OPTIONS = [
  { value:'academic',    Icon: BookOpen,       label:'Academic',    desc:'Performance or learning difficulty' },
  { value:'attendance',  Icon: CalendarCheck2, label:'Attendance',  desc:'Missed sessions or patterns of absence' },
  { value:'behavioural', Icon: AlertOctagon,   label:'Behavioural', desc:'Conduct or engagement concerns' },
  { value:'personal',    Icon: MessageCircle,  label:'Personal',    desc:'Personal or family circumstances' },
  { value:'technical',   Icon: Monitor,        label:'Technical',   desc:'Device, connectivity, or platform issues' },
  { value:'other',       Icon: FileText,       label:'Other',       desc:'Other concerns not listed above' },
];

const PRIORITY_OPTIONS = [
  { value:'low',      label:'Low',      color:'var(--ds-success)', bg:'var(--ds-success-light)', desc:'Monitor — no immediate action needed' },
  { value:'medium',   label:'Medium',   color:'var(--ds-warn)',    bg:'var(--ds-warn-light)',    desc:'Act within the next 2 weeks' },
  { value:'high',     label:'High',     color:'#F97316',            bg:'rgba(249,115,22,0.15)',   desc:'Act within the next 3 days' },
  { value:'critical', label:'Critical', color:'var(--ds-danger)',  bg:'var(--ds-danger-light)', desc:'Immediate action required today' },
];

export default function NewInterventionForm({ learners, instructors, preselectedId, currentUserId }: Props) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    learner_id:        preselectedId || '',
    intervention_type: 'academic',
    priority:          'medium',
    reason:            '',
    action_plan:       '',
    action_taken:      '',
    assigned_to:       currentUserId,
    follow_up_date:    '',
    due_date:          '',
    status:            'open',
  });

  const [showTemplates, setShowTemplates] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const applyTemplate = (t: typeof TEMPLATES[number]) => {
    setForm(f => ({
      ...f,
      intervention_type: t.type,
      priority:          t.priority,
      reason:            t.reason,
      action_plan:       t.action_plan,
    }));
    setShowTemplates(false);
    toast.success(`Template applied: ${t.label}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.learner_id)    { toast.error('Select a learner'); return; }
    if (!form.reason.trim()) { toast.error('Reason is required'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/interventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      toast.success('Intervention logged successfully');
      router.push(preselectedId ? `/learners/${preselectedId}` : '/interventions');
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const selectedPri = PRIORITY_OPTIONS.find(p => p.value === form.priority);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Templates */}
      <div>
        <button
          type="button"
          onClick={() => setShowTemplates(s => !s)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer"
          style={{ background: DS.primaryLight, color: DS.primary, border:`1px solid ${DS.primaryBorder}` }}
        >
          <span className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            Use a Template — pre-fill common scenarios
          </span>
          {showTemplates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showTemplates && (
          <div className="mt-2 rounded-xl overflow-hidden" style={{ border:`1px solid ${DS.border}` }}>
            {TEMPLATES.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applyTemplate(t)}
                className="w-full text-left px-4 py-3.5 transition-all cursor-pointer border-b last:border-b-0"
                style={{ borderColor: DS.borderLight, background: 'transparent' }}
                onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = DS.surfaceHover; }}
                onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <p className="text-sm font-semibold" style={{ color: DS.text }}>{t.label}</p>
                <p className="text-xs mt-0.5 capitalize" style={{ color: DS.textMuted }}>
                  {t.type} · {t.priority} priority
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Learner */}
      <div>
        <label className="form-label">
          Learner <span style={{ color: 'var(--ds-danger)' }}>*</span>
        </label>
        <LearnerCombobox
          learners={learners}
          value={form.learner_id}
          onChange={id => set('learner_id', id)}
          disabled={!!preselectedId}
        />
      </div>

      {/* Type */}
      <div>
        <label className="form-label">
          Type of Intervention <span style={{ color: 'var(--ds-danger)' }}>*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TYPE_OPTIONS.map(t => {
            const active = form.intervention_type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => set('intervention_type', t.value)}
                className="text-left px-3 py-2.5 rounded-xl border-2 text-sm transition-all cursor-pointer"
                style={{
                  borderColor:  active ? DS.primary : DS.border,
                  background:   active ? DS.primaryLight : DS.surface,
                  color:        DS.text,
                }}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <t.Icon className="w-4 h-4 shrink-0" style={{ color: active ? DS.primary : DS.textMuted }} />
                  <p className="font-semibold text-sm">{t.label}</p>
                </div>
                <p className="text-xs pl-6" style={{ color: DS.textMuted }}>{t.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Priority */}
      <div>
        <label className="form-label">
          Priority <span style={{ color: 'var(--ds-danger)' }}>*</span>
        </label>
        <div className="grid grid-cols-4 gap-2">
          {PRIORITY_OPTIONS.map(p => {
            const active = form.priority === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => set('priority', p.value)}
                className="px-3 py-2.5 rounded-xl border-2 text-center text-sm font-bold transition-all cursor-pointer"
                style={{
                  borderColor: active ? p.color : DS.border,
                  background:  active ? p.bg : DS.surface,
                  color:       active ? p.color : DS.textMid,
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        {selectedPri && (
          <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: DS.textMuted }}>
            <AlertTriangle className="w-3 h-3 shrink-0" style={{ color: selectedPri.color }} />
            {selectedPri.desc}
          </p>
        )}
      </div>

      {/* Reason */}
      <div>
        <label className="form-label">
          Reason <span style={{ color: 'var(--ds-danger)' }}>*</span>
        </label>
        <textarea
          value={form.reason}
          onChange={e => set('reason', e.target.value)}
          rows={3}
          className="form-input"
          placeholder="Why is this learner being flagged? Be specific about what you've observed."
        />
      </div>

      {/* Action Plan */}
      <div>
        <label className="form-label">Action Plan</label>
        <textarea
          value={form.action_plan}
          onChange={e => set('action_plan', e.target.value)}
          rows={2}
          className="form-input"
          placeholder="What is the plan to support this learner going forward?"
        />
      </div>

      {/* Actions taken */}
      <div>
        <label className="form-label">Actions Already Taken</label>
        <textarea
          value={form.action_taken}
          onChange={e => set('action_taken', e.target.value)}
          rows={2}
          className="form-input"
          placeholder="What has already been done?"
        />
      </div>

      {/* Assigned + Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="form-label">Assign To</label>
          <select
            value={form.assigned_to}
            onChange={e => set('assigned_to', e.target.value)}
            className="form-select"
          >
            {instructors.map(i => (
              <option key={i.user_id} value={i.user_id}>
                {i.full_name}{i.user_id === currentUserId ? ' (me)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Due Date</label>
          <input
            type="date"
            value={form.due_date}
            onChange={e => set('due_date', e.target.value)}
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Follow-up Date</label>
          <input
            type="date"
            value={form.follow_up_date}
            onChange={e => set('follow_up_date', e.target.value)}
            className="form-input"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-2" style={{ borderTop: `1px solid ${DS.borderLight}` }}>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Logging…</>
            : <><AlertTriangle className="w-4 h-4" /> Log Intervention</>
          }
        </button>
        <Link
          href={preselectedId ? `/learners/${preselectedId}` : '/interventions'}
          className="btn-secondary"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
