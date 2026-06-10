'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DS } from '@/components/platform/tokens';
import { Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface Props {
  learnerId: string;
  learnerName: string;
  learnerCode: string;
}

export default function DeleteLearnerButton({ learnerId, learnerName, learnerCode }: Props) {
  const router = useRouter();
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState('');
  useEscapeKey(() => { setOpen(false); setConfirm(''); }, open);

  const handleDelete = async (permanent: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/learners/${learnerId}${permanent ? '?permanent=true' : ''}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error((await res.json()).error);
      router.push('/learners');
      router.refresh();
    } catch (e) {
      alert(`Failed: ${e instanceof Error ? e.message : String(e)}`);
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
        style={{ color: 'var(--ds-danger)', borderColor: 'var(--ds-danger)' }}>
        <Trash2 className="w-3.5 h-3.5" /> Remove
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-5"
            style={{ background: DS.surface, border: `1px solid var(--ds-danger)` }}>

            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--ds-danger-light)' }}>
                  <AlertTriangle className="w-5 h-5" style={{ color: 'var(--ds-danger)' }} />
                </div>
                <div>
                  <h2 className="text-base font-bold" style={{ color: DS.text }}>Remove Learner</h2>
                  <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>
                    {learnerName} · {learnerCode}
                  </p>
                </div>
              </div>
              <button aria-label="Close" onClick={() => { setOpen(false); setConfirm(''); }}
                className="cursor-pointer mt-0.5" style={{ color: DS.textMuted }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Options */}
            <div className="space-y-3">

              {/* Option 1 — Withdraw */}
              <div className="rounded-xl p-4 space-y-2"
                style={{ background: DS.surfaceHover, border: `1px solid ${DS.border}` }}>
                <p className="text-sm font-bold" style={{ color: DS.text }}>Mark as Withdrawn</p>
                <p className="text-xs leading-relaxed" style={{ color: DS.textMuted }}>
                  The learner is removed from active programmes but all their data — attendance,
                  marks, and history — is kept. They will no longer appear in the active learner list.
                </p>
                <button
                  onClick={() => handleDelete(false)}
                  disabled={loading}
                  className="mt-1 w-full rounded-xl py-2 text-sm font-bold transition-colors cursor-pointer disabled:opacity-50"
                  style={{ background: 'var(--ds-warn-light)', color: 'var(--ds-warn)', border: '1px solid var(--ds-warn)' }}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Mark as Withdrawn'}
                </button>
              </div>

              {/* Option 2 — Permanent delete */}
              <div className="rounded-xl p-4 space-y-2"
                style={{ background: 'var(--ds-danger-light)', border: `1px solid var(--ds-danger)` }}>
                <p className="text-sm font-bold" style={{ color: 'var(--ds-danger)' }}>
                  Permanently Delete
                </p>
                <p className="text-xs leading-relaxed" style={{ color: DS.textMuted }}>
                  Completely removes the learner and <strong style={{ color: DS.text }}>all their data</strong> —
                  assessments, attendance, reports, and history. <strong style={{ color: 'var(--ds-danger)' }}>This cannot be undone.</strong>
                </p>
                <p className="text-xs font-semibold mt-2" style={{ color: DS.textMuted }}>
                  Type <span style={{ color: DS.text, fontFamily: 'monospace' }}>{learnerCode}</span> to confirm:
                </p>
                <input
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder={learnerCode}
                  className="w-full rounded-lg px-3 py-2 text-sm font-mono focus:outline-none"
                  style={{
                    background: DS.surfaceHover as string,
                    border: `1px solid ${confirm === learnerCode ? 'var(--ds-danger)' : DS.border}`,
                    color: DS.text as string,
                  }}
                />
                <button
                  onClick={() => handleDelete(true)}
                  disabled={loading || confirm !== learnerCode}
                  className="w-full rounded-xl py-2 text-sm font-bold transition-colors cursor-pointer disabled:opacity-40"
                  style={{ background: 'var(--ds-danger)', color: '#fff' }}>
                  {loading
                    ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    : 'Delete Permanently'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
