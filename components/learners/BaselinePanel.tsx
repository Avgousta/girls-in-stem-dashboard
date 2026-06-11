'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { DS } from '@/components/platform/tokens';
import { Loader2, CheckCircle2, Pencil } from 'lucide-react';

interface Baseline {
  baseline_id:         string;
  maths_confidence:    number;
  science_confidence:  number;
  digital_confidence:  number;
  prior_coding_exp:    boolean;
  notes:               string | null;
  captured_at:         string;
}

interface Props {
  learnerId:    string;
  existing:     Baseline | null;
  currentMaths: number | null;  // current avg score % — for comparison
  currentSci:   number | null;
}

const LABELS = ['', 'Very low', 'Low', 'Moderate', 'High', 'Very high'];
const CONF_COLOR = (n: number) => n >= 4 ? 'var(--ds-success)' : n >= 3 ? 'var(--ds-warn)' : 'var(--ds-danger)';

function ConfidencePicker({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold" style={{ color: DS.textMid }}>{label}</p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button"
            onClick={() => onChange(n)}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
            style={value === n
              ? { background: DS.primary, color: '#fff' }
              : { background: DS.surfaceHover, color: DS.textMuted, border: `1px solid ${DS.border}` }}>
            {n}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-right" style={{ color: DS.textMuted }}>
        {value ? LABELS[value] : 'Select…'}
      </p>
    </div>
  );
}

function ConfBar({ label, confidence, currentPct }: { label: string; confidence: number; currentPct: number | null }) {
  const baselinePct = Math.round((confidence / 5) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-xs font-semibold" style={{ color: DS.textMid }}>{label}</span>
        <span className="text-xs" style={{ color: DS.textMuted }}>
          Baseline: <strong style={{ color: CONF_COLOR(confidence) }}>{LABELS[confidence]}</strong>
          {currentPct != null && (
            <> · Now: <strong style={{ color: currentPct >= 60 ? 'var(--ds-success)' : 'var(--ds-danger)' }}>{currentPct}%</strong></>
          )}
        </span>
      </div>
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: DS.surfaceHover }}>
        <div className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{ width: `${baselinePct}%`, background: CONF_COLOR(confidence), opacity: 0.4 }} />
        {currentPct != null && (
          <div className="absolute left-0 top-0 h-full rounded-full transition-all"
            style={{ width: `${Math.min(currentPct, 100)}%`, background: currentPct >= 60 ? 'var(--ds-success)' : 'var(--ds-danger)' }} />
        )}
      </div>
    </div>
  );
}

export default function BaselinePanel({ learnerId, existing, currentMaths, currentSci }: Props) {
  const [editing, setEditing] = useState(!existing);
  const [maths,   setMaths]   = useState(existing?.maths_confidence   ?? 3);
  const [science, setScience] = useState(existing?.science_confidence ?? 3);
  const [digital, setDigital] = useState(existing?.digital_confidence ?? 3);
  const [coding,  setCoding]  = useState(existing?.prior_coding_exp   ?? false);
  const [notes,   setNotes]   = useState(existing?.notes ?? '');
  const [saving,  setSaving]  = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/learners/${learnerId}/baseline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maths_confidence:   maths,
          science_confidence: science,
          digital_confidence: digital,
          prior_coding_exp:   coding,
          notes:              notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Baseline saved');
      setEditing(false);
    } catch {
      toast.error('Could not save baseline');
    } finally {
      setSaving(false);
    }
  };

  if (!editing && existing) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            style={{ color: DS.primary }}>
            <Pencil className="w-3 h-3" /> Edit Baseline
          </button>
        </div>
        <ConfBar label="Maths Confidence"   confidence={maths}   currentPct={currentMaths} />
        <ConfBar label="Science Confidence" confidence={science} currentPct={currentSci} />
        <ConfBar label="Digital Confidence" confidence={digital} currentPct={null} />
        <div className="flex items-center gap-2 pt-1">
          <div className="w-3 h-3 rounded-sm flex items-center justify-center"
            style={{ background: coding ? DS.primary : DS.surfaceHover, border: `1px solid ${DS.border}` }}>
            {coding && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
          </div>
          <span className="text-xs" style={{ color: DS.textMid }}>
            {coding ? 'Has prior coding experience' : 'No prior coding experience'}
          </span>
        </div>
        {existing.notes && (
          <p className="text-xs italic" style={{ color: DS.textMuted }}>&quot;{existing.notes}&quot;</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!existing && (
        <div className="rounded-xl p-3"
          style={{ background: 'var(--ds-warn-light)', border: '1px solid var(--ds-warn)' }}>
          <p className="text-xs font-bold" style={{ color: 'var(--ds-warn)' }}>
            No baseline recorded yet — capture it now to track progress over time.
          </p>
        </div>
      )}

      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: DS.textMuted }}>
        Self-reported confidence at enrolment (1 = very low, 5 = very high)
      </p>

      <ConfidencePicker label="Maths confidence"   value={maths}   onChange={setMaths}   />
      <ConfidencePicker label="Science confidence" value={science} onChange={setScience} />
      <ConfidencePicker label="Digital confidence" value={digital} onChange={setDigital} />

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={coding} onChange={e => setCoding(e.target.checked)}
          className="w-4 h-4 rounded" />
        <span className="text-xs font-semibold" style={{ color: DS.textMid }}>
          Had prior coding / programming experience before enrolment
        </span>
      </label>

      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Optional notes about learner's background…"
        rows={2}
        maxLength={500}
        className="w-full rounded-xl px-3 py-2 text-sm resize-none"
        style={{ background: DS.surfaceHover, color: DS.text, border: `1px solid ${DS.border}` }}
      />

      <div className="flex gap-2">
        {existing && (
          <button onClick={() => setEditing(false)}
            className="flex-1 py-2 rounded-xl text-sm font-semibold cursor-pointer"
            style={{ background: DS.surfaceHover, color: DS.textMid }}>
            Cancel
          </button>
        )}
        <button onClick={save} disabled={saving}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
          style={{ background: DS.primary, color: '#fff', opacity: saving ? 0.7 : 1 }}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : 'Save Baseline'}
        </button>
      </div>
    </div>
  );
}
