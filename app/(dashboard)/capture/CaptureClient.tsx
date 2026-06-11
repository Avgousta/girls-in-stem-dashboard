'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { DS } from '@/components/platform/tokens';
import {
  CheckCircle2, XCircle, Clock, FileText, ChevronLeft,
  Send, Loader2, AlertTriangle, Users, Calendar,
} from 'lucide-react';
import type { CaptureProgramme, CaptureLearner } from './page';

type AttStatus = 'present' | 'absent' | 'late' | 'excused';

interface LearnerRecord {
  learner_id: string;
  name:       string;
  school:     string;
  code:       string;
  status:     AttStatus | null;
}

const STATUS_CFG: Record<AttStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  present: { label: 'Present', color: '#34D399', bg: 'rgba(52,211,153,0.15)',  icon: <CheckCircle2 className="w-5 h-5" /> },
  absent:  { label: 'Absent',  color: '#EF4444', bg: 'rgba(239,68,68,0.15)',   icon: <XCircle      className="w-5 h-5" /> },
  late:    { label: 'Late',    color: '#FBBF24', bg: 'rgba(251,191,36,0.15)',  icon: <Clock        className="w-5 h-5" /> },
  excused: { label: 'Excused', color: '#818CF8', bg: 'rgba(129,140,248,0.15)', icon: <FileText     className="w-5 h-5" /> },
};

interface Props {
  programmes:      CaptureProgramme[];
  learnersByProg:  Record<string, CaptureLearner[]>;
  capturedBy:      string;
}

// ─── Step 1: Programme + Date picker ─────────────────────────────────────────
function SetupStep({ programmes, onNext }: {
  programmes: CaptureProgramme[];
  onNext: (progId: string, progName: string, date: string) => void;
}) {
  const [progId,   setProgId]   = useState(programmes[0]?.program_id ?? '');
  const [date,     setDate]     = useState(new Date().toISOString().slice(0, 10));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-6"
      style={{ background: DS.bg }}>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: DS.primaryLight }}>
            <Users className="w-7 h-7" style={{ color: DS.primary }} />
          </div>
          <h1 className="text-2xl font-black" style={{ color: DS.text }}>Take Attendance</h1>
          <p className="text-sm mt-1" style={{ color: DS.textMuted }}>Select programme and session date</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: DS.textMuted }}>
              Programme
            </label>
            <select value={progId} onChange={e => setProgId(e.target.value)}
              className="form-select w-full text-base py-4 rounded-2xl"
              style={{ fontSize: 16 }}>
              {programmes.map(p => (
                <option key={p.program_id} value={p.program_id}>{p.program_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: DS.textMuted }}>
              Session Date
            </label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="form-input w-full text-base py-4 rounded-2xl"
              style={{ fontSize: 16 }} />
          </div>

          <button
            onClick={() => {
              const prog = programmes.find(p => p.program_id === progId);
              if (prog && date) onNext(progId, prog.program_name, date);
            }}
            disabled={!progId || !date}
            className="w-full py-4 rounded-2xl text-base font-bold cursor-pointer flex items-center justify-center gap-2 transition-all"
            style={{ background: DS.primary, color: '#fff', opacity: (!progId || !date) ? 0.5 : 1 }}>
            <Calendar className="w-5 h-5" /> Start Session
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Learner swipe card ───────────────────────────────────────────────────────
function LearnerCard({ record, onStatus, onFlag }: {
  record: LearnerRecord;
  onStatus: (id: string, s: AttStatus) => void;
  onFlag: (id: string, name: string) => void;
}) {
  const s = record.status;

  return (
    <div className="rounded-2xl p-4 space-y-3 transition-all"
      style={{
        background: s ? STATUS_CFG[s].bg : DS.surface,
        border: `2px solid ${s ? STATUS_CFG[s].color : DS.border}`,
      }}>
      {/* Name + school */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-base font-bold truncate" style={{ color: DS.text }}>{record.name}</p>
          <p className="text-xs" style={{ color: DS.textMuted }}>{record.school} · {record.code}</p>
        </div>
        {s && (
          <span className="text-sm font-bold flex items-center gap-1.5 shrink-0"
            style={{ color: STATUS_CFG[s].color }}>
            {STATUS_CFG[s].icon} {STATUS_CFG[s].label}
          </span>
        )}
      </div>

      {/* Status buttons */}
      <div className="grid grid-cols-4 gap-2">
        {(Object.entries(STATUS_CFG) as [AttStatus, typeof STATUS_CFG[AttStatus]][]).map(([key, cfg]) => (
          <button key={key}
            onClick={() => onStatus(record.learner_id, key)}
            className="py-3 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95"
            style={{
              background: s === key ? cfg.color        : DS.surfaceHover,
              color:      s === key ? '#fff'           : DS.textMid as string,
              border:     s === key ? 'none'           : `1px solid ${DS.border}`,
            }}>
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Flag concern */}
      {s === 'absent' && (
        <button onClick={() => onFlag(record.learner_id, record.name)}
          className="w-full py-2 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-all"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>
          <AlertTriangle className="w-3.5 h-3.5" /> Flag concern
        </button>
      )}
    </div>
  );
}

// ─── Quick flag modal ─────────────────────────────────────────────────────────
function FlagModal({ learnerId, learnerName, userId, onClose }: {
  learnerId: string; learnerName: string; userId: string; onClose: () => void;
}) {
  const [reason,  setReason]  = useState('');
  const [saving,  setSaving]  = useState(false);

  const save = async () => {
    if (!reason.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/v1/interventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learner_id:        learnerId,
          flagged_by:        userId,
          intervention_type: 'attendance',
          priority:          'medium',
          reason:            reason.trim(),
        }),
      });
      toast.success(`Concern flagged for ${learnerName}`);
      onClose();
    } catch {
      toast.error('Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl p-6 space-y-4"
        style={{ background: DS.surface }}
        onClick={e => e.stopPropagation()}>
        <div>
          <p className="text-base font-bold" style={{ color: DS.text }}>Flag Concern</p>
          <p className="text-sm" style={{ color: DS.textMuted }}>For: {learnerName}</p>
        </div>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Brief reason for flagging…"
          rows={3}
          className="form-input w-full text-base resize-none rounded-2xl"
          style={{ fontSize: 16 }}
          autoFocus
        />
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold cursor-pointer"
            style={{ background: DS.surfaceHover, color: DS.textMid }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving || !reason.trim()}
            className="flex-1 py-3 rounded-2xl text-sm font-bold cursor-pointer flex items-center justify-center gap-2"
            style={{ background: '#EF4444', color: '#fff', opacity: saving || !reason.trim() ? 0.6 : 1 }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            Flag
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Attendance capture ───────────────────────────────────────────────
function CaptureStep({ records, progName, date, capturedBy, programId, onBack, onDone }: {
  records:     LearnerRecord[];
  progName:    string;
  date:        string;
  capturedBy:  string;
  programId:   string;
  onBack:      () => void;
  onDone:      (saved: number) => void;
}) {
  const [statuses,   setStatuses]   = useState<Record<string, AttStatus | null>>({});
  const [flagging,   setFlagging]   = useState<{ id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setStatus = (id: string, s: AttStatus) =>
    setStatuses(prev => ({ ...prev, [id]: prev[id] === s ? null : s }));

  const filled   = Object.values(statuses).filter(Boolean).length;
  const allDone  = filled === records.length;

  const markAll = (s: AttStatus) => {
    const next: Record<string, AttStatus> = {};
    records.forEach(r => { next[r.learner_id] = s; });
    setStatuses(next);
  };

  const submit = async () => {
    const toSubmit = records.filter(r => statuses[r.learner_id]);
    if (!toSubmit.length) { toast.error('Mark at least one learner.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_id:   programId,
          session_date: date,
          captured_by:  capturedBy,
          records:      toSubmit.map(r => ({ learner_id: r.learner_id, status: statuses[r.learner_id] })),
        }),
      });
      if (!res.ok) throw new Error();
      onDone(toSubmit.length);
    } catch {
      toast.error('Could not save attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const displayRecords = records.map(r => ({
    ...r, status: statuses[r.learner_id] ?? null,
  }));

  const present = Object.values(statuses).filter(s => s === 'present').length;
  const absent  = Object.values(statuses).filter(s => s === 'absent').length;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: DS.bg }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{ background: DS.surface, borderBottom: `1px solid ${DS.border}` }}>
        <button onClick={onBack} className="p-2 rounded-xl cursor-pointer"
          style={{ background: DS.surfaceHover }}>
          <ChevronLeft className="w-5 h-5" style={{ color: DS.textMid }} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: DS.text }}>{progName}</p>
          <p className="text-xs" style={{ color: DS.textMuted }}>{date} · {filled}/{records.length} marked</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold">
          <span style={{ color: '#34D399' }}>{present}✓</span>
          <span style={{ color: '#EF4444' }}>{absent}✗</span>
        </div>
      </div>

      {/* Quick mark all */}
      <div className="px-4 py-3 flex gap-2" style={{ borderBottom: `1px solid ${DS.borderLight}` }}>
        <span className="text-xs font-semibold self-center mr-1" style={{ color: DS.textMuted }}>Mark all:</span>
        {(['present', 'absent'] as AttStatus[]).map(s => (
          <button key={s} onClick={() => markAll(s)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
            style={{ background: STATUS_CFG[s].bg, color: STATUS_CFG[s].color }}>
            {STATUS_CFG[s].label}
          </button>
        ))}
      </div>

      {/* Learner list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32">
        {displayRecords.map(r => (
          <LearnerCard key={r.learner_id} record={r}
            onStatus={setStatus}
            onFlag={(id, name) => setFlagging({ id, name })} />
        ))}
      </div>

      {/* Sticky submit */}
      <div className="fixed bottom-0 left-0 right-0 p-4"
        style={{ background: DS.surface, borderTop: `1px solid ${DS.border}` }}>
        <button onClick={submit} disabled={submitting || filled === 0}
          className="w-full py-4 rounded-2xl text-base font-bold cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-95"
          style={{ background: DS.primary, color: '#fff', opacity: submitting || filled === 0 ? 0.5 : 1 }}>
          {submitting
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving…</>
            : <><Send className="w-5 h-5" /> Save {filled} Record{filled !== 1 ? 's' : ''}{!allDone ? ` (${records.length - filled} unmarked)` : ''}</>}
        </button>
      </div>

      {flagging && (
        <FlagModal
          learnerId={flagging.id}
          learnerName={flagging.name}
          userId={capturedBy}
          onClose={() => setFlagging(null)}
        />
      )}
    </div>
  );
}

// ─── Step 3: Done ─────────────────────────────────────────────────────────────
function DoneStep({ saved, progName, date, onReset }: {
  saved: number; progName: string; date: string; onReset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-6"
      style={{ background: DS.bg }}>
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
          style={{ background: 'var(--ds-success-light)', border: '2px solid var(--ds-success)' }}>
          <CheckCircle2 className="w-10 h-10" style={{ color: 'var(--ds-success)' }} />
        </div>
        <h1 className="text-2xl font-black" style={{ color: DS.text }}>Attendance Saved!</h1>
        <p className="text-sm" style={{ color: DS.textMuted }}>
          {saved} record{saved !== 1 ? 's' : ''} saved for <strong style={{ color: DS.text }}>{progName}</strong> on {date}.
        </p>
        <button onClick={onReset}
          className="w-full py-4 rounded-2xl text-base font-bold cursor-pointer"
          style={{ background: DS.primary, color: '#fff' }}>
          Take Another Session
        </button>
        <a href="/attendance"
          className="block w-full py-3 rounded-2xl text-sm font-semibold"
          style={{ background: DS.surfaceHover, color: DS.textMid }}>
          View Attendance History
        </a>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CaptureClient({ programmes, learnersByProg, capturedBy }: Props) {
  const [step,      setStep]      = useState<'setup' | 'capture' | 'done'>('setup');
  const [progId,    setProgId]    = useState('');
  const [progName,  setProgName]  = useState('');
  const [date,      setDate]      = useState('');
  const [savedCount,setSavedCount] = useState(0);

  const learners = useMemo((): CaptureLearner[] => learnersByProg[progId] ?? [], [progId, learnersByProg]);

  const records: LearnerRecord[] = learners.map(l => ({
    learner_id: l.learner_id,
    name:       l.name,
    school:     l.school,
    code:       l.learner_code,
    status:     null,
  }));

  if (step === 'done') {
    return <DoneStep saved={savedCount} progName={progName} date={date}
      onReset={() => { setStep('setup'); setProgId(''); setDate(''); }} />;
  }

  if (step === 'capture') {
    return <CaptureStep
      records={records}
      progName={progName}
      date={date}
      capturedBy={capturedBy}
      programId={progId}
      onBack={() => setStep('setup')}
      onDone={n => { setSavedCount(n); setStep('done'); }}
    />;
  }

  return (
    <SetupStep
      programmes={programmes}
      onNext={(id, name, d) => { setProgId(id); setProgName(name); setDate(d); setStep('capture'); }}
    />
  );
}
