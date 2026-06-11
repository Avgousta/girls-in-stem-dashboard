'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { DS } from '@/components/platform/tokens';

const EMOJIS: Record<number, { emoji: string; label: string; color: string }> = {
  1: { emoji: '😔', label: 'Struggling',  color: '#EF4444' },
  2: { emoji: '😟', label: 'Difficult',   color: '#F97316' },
  3: { emoji: '😐', label: 'Okay',        color: '#FBBF24' },
  4: { emoji: '😊', label: 'Good',        color: '#34D399' },
  5: { emoji: '🤩', label: 'Great!',      color: '#7C3AED' },
};

const BARRIERS = [
  { value: 'academic',   label: 'Schoolwork' },
  { value: 'personal',   label: 'Personal' },
  { value: 'health',     label: 'Health' },
  { value: 'financial',  label: 'Financial' },
  { value: 'transport',  label: 'Getting here' },
  { value: 'other',      label: 'Other' },
] as const;

// Returns ISO Monday of current week
function thisMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

interface Props {
  learnerId: string;
  alreadySubmitted?: boolean;
  existingRating?: number | null;
}

export default function PulseCheckIn({ learnerId, alreadySubmitted, existingRating }: Props) {
  const [submitted, setSubmitted] = useState(alreadySubmitted ?? false);
  const [rating,    setRating]    = useState<number | null>(existingRating ?? null);
  const [barrier,   setBarrier]   = useState<string | null>(null);
  const [notes,     setNotes]     = useState('');
  const [saving,    setSaving]    = useState(false);
  const [step,      setStep]      = useState<'rating' | 'barrier' | 'done'>(
    alreadySubmitted ? 'done' : 'rating'
  );

  const weekDate = thisMonday();

  const submitRating = async (r: number) => {
    setRating(r);
    if (r >= 3) {
      // Happy path — submit immediately
      await save(r, null, '');
    } else {
      // Struggling — ask for more detail
      setStep('barrier');
    }
  };

  const save = async (r: number, b: string | null, n: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/v1/pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learner_id:   learnerId,
          week_date:    weekDate,
          rating:       r,
          barrier_flag: b,
          notes:        n || null,
        }),
      });
      if (!res.ok) throw new Error();
      setStep('done');
      setSubmitted(true);
      toast.success('Thanks for checking in! 🌟');
    } catch {
      toast.error('Could not save — please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (step === 'done') {
    const cfg = rating ? EMOJIS[rating] : null;
    return (
      <div className="rounded-2xl p-5 text-center space-y-1"
        style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <p className="text-3xl">{cfg?.emoji ?? '✓'}</p>
        <p className="text-sm font-bold" style={{ color: DS.text }}>Check-in recorded</p>
        <p className="text-xs" style={{ color: DS.textMuted }}>
          You said you&#39;re feeling <strong style={{ color: cfg?.color }}>{cfg?.label}</strong> this week.
        </p>
      </div>
    );
  }

  if (step === 'barrier') {
    return (
      <div className="rounded-2xl p-5 space-y-4"
        style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <div>
          <p className="text-sm font-bold mb-0.5" style={{ color: DS.text }}>
            Sorry to hear that {EMOJIS[rating ?? 1].emoji}
          </p>
          <p className="text-xs" style={{ color: DS.textMuted }}>
            Is anything getting in the way? (optional)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {BARRIERS.map(b => (
            <button key={b.value} type="button"
              onClick={() => setBarrier(barrier === b.value ? null : b.value)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer"
              style={barrier === b.value
                ? { background: DS.primary, color: '#fff' }
                : { background: DS.surfaceHover, color: DS.textMid, border: `1px solid ${DS.border}` }}>
              {b.label}
            </button>
          ))}
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Anything else you want to share? (optional)"
          rows={2}
          maxLength={500}
          className="w-full rounded-xl px-3 py-2 text-sm resize-none"
          style={{ background: DS.surfaceHover, color: DS.text, border: `1px solid ${DS.border}` }}
        />
        <button
          onClick={() => save(rating!, barrier, notes)}
          disabled={saving}
          className="w-full py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer"
          style={{ background: DS.primary, color: '#fff', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : 'Submit'}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-5 space-y-4"
      style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: DS.textMuted }}>
          Weekly Check-In
        </p>
        <p className="text-sm font-semibold" style={{ color: DS.text }}>
          How are you feeling about the programme this week?
        </p>
      </div>
      <div className="flex justify-between gap-2">
        {([1, 2, 3, 4, 5] as const).map(n => {
          const cfg = EMOJIS[n];
          return (
            <button key={n} type="button"
              onClick={() => submitRating(n)}
              disabled={saving}
              className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all cursor-pointer"
              style={{ background: DS.surfaceHover, border: `1px solid ${DS.border}` }}
              title={cfg.label}>
              <span className="text-2xl">{cfg.emoji}</span>
              <span className="text-[10px] font-semibold" style={{ color: DS.textMuted }}>{cfg.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
