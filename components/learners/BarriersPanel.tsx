'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { DS } from '@/components/platform/tokens';
import { Plus, Loader2, CheckCircle2, AlertTriangle, ShieldOff } from 'lucide-react';
import { fmt } from '@/utils';

const BARRIER_TYPES = [
  { value: 'academic',    label: 'Academic',    emoji: '📚' },
  { value: 'personal',    label: 'Personal',    emoji: '💭' },
  { value: 'health',      label: 'Health',      emoji: '🏥' },
  { value: 'financial',   label: 'Financial',   emoji: '💰' },
  { value: 'transport',   label: 'Transport',   emoji: '🚌' },
  { value: 'confidence',  label: 'Confidence',  emoji: '💪' },
  { value: 'family',      label: 'Family',      emoji: '🏠' },
  { value: 'other',       label: 'Other',       emoji: '⚠️' },
] as const;

const SEVERITY_CFG = [
  { value: 1, label: 'Low',    color: 'var(--ds-success)' },
  { value: 2, label: 'Medium', color: 'var(--ds-warn)'    },
  { value: 3, label: 'High',   color: 'var(--ds-danger)'  },
] as const;

interface Barrier {
  barrier_id:   string;
  barrier_type: string;
  severity:     number;
  reported_by:  string;
  notes:        string | null;
  active:       boolean;
  resolved_at:  string | null;
  created_at:   string;
}

interface Props {
  learnerId: string;
  initial:   Barrier[];
}

export default function BarriersPanel({ learnerId, initial }: Props) {
  const [barriers, setBarriers] = useState(initial);
  const [adding,   setAdding]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [showAll,  setShowAll]  = useState(false);

  const [form, setForm] = useState({
    barrier_type: 'academic' as string,
    severity:     2,
    reported_by:  'staff' as string,
    notes:        '',
  });

  const active   = barriers.filter(b => b.active);
  const resolved = barriers.filter(b => !b.active);

  const add = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/learners/${learnerId}/barriers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setBarriers(prev => [json.data, ...prev]);
      setAdding(false);
      setForm({ barrier_type: 'academic', severity: 2, reported_by: 'staff', notes: '' });
      toast.success('Barrier recorded');
    } catch {
      toast.error('Could not save');
    } finally {
      setSaving(false);
    }
  };

  const resolve = async (bid: string) => {
    try {
      const res = await fetch(`/api/v1/learners/${learnerId}/barriers/${bid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      });
      if (!res.ok) throw new Error();
      setBarriers(prev => prev.map(b => b.barrier_id === bid ? { ...b, active: false, resolved_at: new Date().toISOString() } : b));
      toast.success('Barrier resolved');
    } catch {
      toast.error('Could not update');
    }
  };

  const typeInfo = (t: string) => BARRIER_TYPES.find(x => x.value === t) ?? { emoji: '⚠️', label: t };
  const sevInfo  = (s: number) => SEVERITY_CFG.find(x => x.value === s) ?? SEVERITY_CFG[1];

  return (
    <div className="space-y-4">
      {/* Active barriers */}
      {active.length === 0 ? (
        <p className="text-xs py-3 text-center" style={{ color: DS.textMuted }}>
          No active barriers recorded.
        </p>
      ) : (
        <div className="space-y-2">
          {active.map(b => {
            const t = typeInfo(b.barrier_type);
            const s = sevInfo(b.severity);
            return (
              <div key={b.barrier_id} className="flex items-start gap-3 rounded-xl px-4 py-3"
                style={{ background: `${s.color}12`, border: `1px solid ${s.color}40` }}>
                <span className="text-xl shrink-0 mt-0.5">{t.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold" style={{ color: DS.text }}>{t.label}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${s.color}20`, color: s.color }}>
                      {s.label} severity
                    </span>
                    <span className="text-[10px] capitalize" style={{ color: DS.textMuted }}>
                      Reported by {b.reported_by}
                    </span>
                  </div>
                  {b.notes && (
                    <p className="text-xs mt-1" style={{ color: DS.textMid }}>{b.notes}</p>
                  )}
                  <p className="text-[10px] mt-1" style={{ color: DS.textMuted }}>{fmt.date(b.created_at)}</p>
                </div>
                <button onClick={() => resolve(b.barrier_id)}
                  className="shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer"
                  style={{ background: 'var(--ds-success-light)', color: 'var(--ds-success)' }}>
                  <CheckCircle2 className="w-3 h-3" /> Resolve
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add barrier form */}
      {adding ? (
        <div className="rounded-xl p-4 space-y-3"
          style={{ background: DS.surfaceHover, border: `1px solid ${DS.primaryBorder}` }}>
          <p className="text-xs font-bold" style={{ color: DS.text }}>Record Barrier</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: DS.textMuted }}>Type</label>
              <select value={form.barrier_type}
                onChange={e => setForm(f => ({ ...f, barrier_type: e.target.value }))}
                className="form-select w-full text-sm">
                {BARRIER_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: DS.textMuted }}>Severity</label>
              <div className="flex gap-1.5">
                {SEVERITY_CFG.map(s => (
                  <button key={s.value} type="button"
                    onClick={() => setForm(f => ({ ...f, severity: s.value }))}
                    className="flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer"
                    style={form.severity === s.value
                      ? { background: s.color, color: '#fff' }
                      : { background: DS.surfaceHover, color: DS.textMuted, border: `1px solid ${DS.border}` }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: DS.textMuted }}>Reported by</label>
            <div className="flex gap-2">
              {['staff', 'learner', 'parent'].map(r => (
                <button key={r} type="button"
                  onClick={() => setForm(f => ({ ...f, reported_by: r }))}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer"
                  style={form.reported_by === r
                    ? { background: DS.primary, color: '#fff' }
                    : { background: DS.surfaceHover, color: DS.textMuted, border: `1px solid ${DS.border}` }}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Optional context or notes…" rows={2}
            className="form-input w-full text-sm resize-none" />
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold cursor-pointer"
              style={{ background: DS.surface, color: DS.textMid }}>
              Cancel
            </button>
            <button onClick={add} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer flex items-center justify-center gap-2"
              style={{ background: DS.primary, color: '#fff', opacity: saving ? 0.7 : 1 }}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : 'Save Barrier'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer transition-all"
          style={{ background: 'var(--ds-warn-light)', color: 'var(--ds-warn)', border: '1px solid var(--ds-warn)' }}>
          <Plus className="w-3.5 h-3.5" /> Record Barrier
        </button>
      )}

      {/* Resolved barriers (collapsed) */}
      {resolved.length > 0 && (
        <div>
          <button onClick={() => setShowAll(o => !o)}
            className="text-xs font-semibold cursor-pointer"
            style={{ color: DS.textMuted }}>
            <ShieldOff className="w-3 h-3 inline mr-1" />
            {showAll ? 'Hide' : 'Show'} {resolved.length} resolved barrier{resolved.length !== 1 ? 's' : ''}
          </button>
          {showAll && (
            <div className="mt-2 space-y-1.5">
              {resolved.map(b => {
                const t = typeInfo(b.barrier_type);
                return (
                  <div key={b.barrier_id} className="flex items-center gap-2 px-3 py-2 rounded-lg opacity-60"
                    style={{ background: DS.surfaceHover }}>
                    <span>{t.emoji}</span>
                    <span className="text-xs line-through" style={{ color: DS.textMuted }}>{t.label}</span>
                    <span className="text-[10px] ml-auto" style={{ color: DS.textMuted }}>
                      Resolved {b.resolved_at ? fmt.date(b.resolved_at) : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
