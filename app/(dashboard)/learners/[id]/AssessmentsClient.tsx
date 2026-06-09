'use client';
import { useState, useRef, useEffect } from 'react';
import { DS } from '@/components/platform/tokens';
import { Pencil, Plus, X, Check, Trash2, Loader2 } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Assessment {
  assessment_id: string;
  subject: string;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  grade_band: string | null;
  assessment_date: string | null;
  notes: string | null;
  term: number | null;
  assessment_type: string;
}

interface Props {
  assessments: Assessment[];
  learnerId: string;
  programId: string;
  learnerGrade: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const gradeOf = (a: Assessment) => {
  const m = (a.notes ?? '').match(/\(Grade (\d+) \((\d{4})\)\)/);
  return m ? `Grade ${m[1]} (${m[2]})` : 'Other';
};

const GRADE_ORDER = ['Grade 9 (2024)', 'Grade 10 (2025)', 'Grade 11 (2026)', 'Other'];

const TERM_DATES: Record<string, string> = {
  'none': `${new Date().getFullYear()}-01-01`,
  '1':    `${new Date().getFullYear()}-04-10`,
  '2':    `${new Date().getFullYear()}-06-30`,
  '3':    `${new Date().getFullYear()}-09-12`,
  '4':    `${new Date().getFullYear()}-11-20`,
};

function pctColor(p: number | null) {
  if (p === null) return DS.textMuted as string;
  return p >= 80 ? '#818CF8' : p >= 70 ? 'var(--ds-success)' : p >= 50 ? 'var(--ds-warn)' : 'var(--ds-danger)';
}
function pctBg(p: number | null) {
  if (p === null) return DS.surfaceHover as string;
  return p >= 80 ? 'rgba(129,140,248,0.10)' : p >= 70 ? 'var(--ds-success-light)' : p >= 50 ? 'var(--ds-warn-light)' : 'var(--ds-danger-light)';
}
function gradeBand(pct: number) {
  return pct >= 80 ? 'Distinction' : pct >= 70 ? 'Merit' : pct >= 50 ? 'Pass' : 'Needs Support';
}

// ── Edit/Add panel ────────────────────────────────────────────────────────────
interface PanelProps {
  assessment: Assessment | null;  // null = adding new
  slot: { subject: string; notesLabel: string; term: number | null; assessType: string; date: string };
  learnerId: string;
  programId: string;
  onClose: () => void;
  onSaved: (a: Assessment) => void;
  onDeleted: (id: string) => void;
}

function EditPanel({ assessment, slot, learnerId, programId, onClose, onSaved, onDeleted }: PanelProps) {
  const [score,    setScore]    = useState(assessment ? String(assessment.score) : '');
  const [maxScore, setMaxScore] = useState(assessment ? String(assessment.max_score) : '100');
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const pct = score && !isNaN(Number(score)) && Number(maxScore) > 0
    ? Math.round((Number(score) / Number(maxScore)) * 100)
    : null;

  const handleSave = async () => {
    if (!score || pct === null) return;
    setSaving(true);
    try {
      if (assessment) {
        // PATCH existing
        const res = await fetch(`/api/v1/assessments/${assessment.assessment_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ score: Number(score), max_score: Number(maxScore) }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        const updated = await res.json();
        onSaved({ ...assessment, score: Number(score), max_score: Number(maxScore), percentage: pct, grade_band: gradeBand(pct), ...updated.data });
      } else {
        // POST new
        const res = await fetch('/api/v1/assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            learner_id:      learnerId,
            program_id:      programId,
            subject:         slot.subject,
            score:           Number(score),
            max_score:       Number(maxScore),
            grade_band:      gradeBand(pct),
            assessment_date: slot.date,
            assessment_type: slot.assessType,
            difficulty:      'medium',
            term:            slot.term ?? undefined,
            notes:           slot.notesLabel,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        const created = await res.json();
        onSaved(created.data ?? created);
      }
      onClose();
    } catch (e) {
      alert(`Save failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!assessment || !confirm('Remove this assessment record?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/assessments/${assessment.assessment_id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      onDeleted(assessment.assessment_id);
      onClose();
    } catch (e) {
      alert(`Delete failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setDeleting(false); }
  };

  return (
    <div ref={ref}
      className="absolute z-50 rounded-2xl shadow-2xl p-4 w-64"
      style={{ background: DS.surface, border: `2px solid ${DS.primaryBorder}`, top: '110%', left: '50%', transform: 'translateX(-50%)' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: DS.textMuted }}>
          {assessment ? 'Edit mark' : 'Add mark'}
        </p>
        <button onClick={onClose} className="cursor-pointer" style={{ color: DS.textMuted }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs mb-3 font-medium" style={{ color: DS.textMid }}>
        {slot.notesLabel.replace(/ \(Grade.*$/, '')}
      </p>

      {/* Score inputs */}
      <div className="flex gap-2 mb-3 items-center">
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: DS.textMuted }}>Score</p>
          <input
            type="number" value={score} min={0} max={Number(maxScore)}
            onChange={e => setScore(e.target.value)}
            autoFocus
            className="w-full rounded-lg px-3 py-2 text-sm font-mono focus:outline-none"
            style={{ background: DS.surfaceHover as string, border: `1px solid ${DS.border}`, color: DS.text as string }}
          />
        </div>
        <span className="text-sm mt-5" style={{ color: DS.textMuted }}>/</span>
        <div className="w-20">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: DS.textMuted }}>Max</p>
          <input
            type="number" value={maxScore} min={1}
            onChange={e => setMaxScore(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm font-mono focus:outline-none"
            style={{ background: DS.surfaceHover as string, border: `1px solid ${DS.border}`, color: DS.text as string }}
          />
        </div>
      </div>

      {/* Live preview */}
      {pct !== null && (
        <div className="rounded-lg px-3 py-2 mb-3 text-center"
          style={{ background: pctBg(pct), border: `1px solid ${pctColor(pct)}` }}>
          <span className="text-lg font-black tabular-nums" style={{ color: pctColor(pct) }}>{pct}%</span>
          <span className="text-xs ml-2" style={{ color: pctColor(pct) }}>{gradeBand(pct)}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving || !score}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-bold transition-colors cursor-pointer disabled:opacity-40"
          style={{ background: 'var(--ds-success)', color: '#fff' }}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Save
        </button>
        {assessment && (
          <button onClick={handleDelete} disabled={deleting}
            className="p-2 rounded-xl cursor-pointer transition-colors disabled:opacity-40"
            style={{ background: 'var(--ds-danger-light)', color: 'var(--ds-danger)' }}>
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Score chip (clickable) ────────────────────────────────────────────────────
interface ChipProps {
  label: string;
  assessment: Assessment | null;
  slot: { subject: string; notesLabel: string; term: number | null; assessType: string; date: string };
  learnerId: string;
  programId: string;
  onSaved: (a: Assessment) => void;
  onDeleted: (id: string) => void;
}

function ScoreChip({ label, assessment, slot, learnerId, programId, onSaved, onDeleted }: ChipProps) {
  const [open, setOpen] = useState(false);
  const pct = assessment?.percentage ?? null;

  return (
    <div className="relative flex-1" style={{ minWidth: 100 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full rounded-xl p-3 text-center group transition-all cursor-pointer"
        style={{
          background: pct !== null ? pctBg(pct) : DS.surfaceHover as string,
          border: `1px solid ${pct !== null ? pctColor(pct) : DS.border}`,
          opacity: pct === null ? 0.55 : 1,
        }}>
        <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: DS.textMuted }}>{label}</p>
        {pct !== null ? (
          <>
            <p className="text-xl font-black tabular-nums" style={{ color: pctColor(pct) }}>{Math.round(pct)}%</p>
            <p className="text-[9px] font-semibold mt-0.5 uppercase tracking-wide" style={{ color: pctColor(pct) }}>
              {assessment?.grade_band}
            </p>
          </>
        ) : (
          <p className="text-lg" style={{ color: DS.textMuted }}>
            <Plus className="w-4 h-4 mx-auto" />
          </p>
        )}
        {/* Hover icon */}
        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {pct !== null
            ? <Pencil className="w-3 h-3" style={{ color: DS.textMuted }} />
            : <Plus className="w-3 h-3" style={{ color: DS.textMuted }} />}
        </div>
      </button>

      {open && (
        <EditPanel
          assessment={assessment}
          slot={slot}
          learnerId={learnerId}
          programId={programId}
          onClose={() => setOpen(false)}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      )}
    </div>
  );
}

// ── Main grouped component ────────────────────────────────────────────────────
export default function AssessmentsClient({ assessments: initial, learnerId, programId, learnerGrade }: Props) {
  const [assessments, setAssessments] = useState<Assessment[]>(initial);

  const handleSaved = (updated: Assessment) => {
    setAssessments(prev => {
      const exists = prev.find(a => a.assessment_id === updated.assessment_id);
      return exists
        ? prev.map(a => a.assessment_id === updated.assessment_id ? updated : a)
        : [...prev, updated];
    });
  };

  const handleDeleted = (id: string) => {
    setAssessments(prev => prev.filter(a => a.assessment_id !== id));
  };

  // ── Grouping logic ──────────────────────────────────────────────────────────
  type TermData = {
    mMaths: Assessment|null; sMaths: Assessment|null;
    mScience: Assessment|null; sScience: Assessment|null;
    app: Assessment[]; assign: Assessment[]; baseline: Assessment[];
  };
  const grouped: Record<string, Record<string, TermData>> = {};

  for (const a of assessments) {
    const grade = gradeOf(a);
    const term  = String(a.term ?? 'none');
    if (!grouped[grade]) grouped[grade] = {};
    if (!grouped[grade][term]) grouped[grade][term] = { mMaths: null, sMaths: null, mScience: null, sScience: null, app: [], assign: [], baseline: [] };
    const td = grouped[grade][term];
    const notes = a.notes ?? '';

    if (a.assessment_type === 'other' && notes.toLowerCase().includes('baseline'))  td.baseline.push(a);
    else if (a.assessment_type === 'assignment' || notes.toLowerCase().includes('assignment')) td.assign.push(a);
    else if (a.assessment_type === 'quiz' || notes.toLowerCase().includes('application mark')) td.app.push(a);
    else if (notes.startsWith('Melisizwe Maths'))   td.mMaths   = a;
    else if (notes.startsWith('School Maths'))       td.sMaths   = a;
    else if (notes.startsWith('Melisizwe Science'))  td.mScience = a;
    else if (notes.startsWith('School Science'))     td.sScience = a;
  }

  const TERM_LABELS: Record<string, string> = { '1':'Term 1','2':'Term 2','3':'Term 3','4':'Term 4','none':'Other' };

  // Always include the learner's current grade year so new learners see an empty grid
  const currentYear = new Date().getFullYear();
  if (learnerGrade) {
    const currentGradeLabel = `Grade ${learnerGrade} (${currentYear})`;
    if (!grouped[currentGradeLabel]) grouped[currentGradeLabel] = {};
    // Ensure all 4 terms exist so chips render
    ['1','2','3','4'].forEach(t => {
      if (!grouped[currentGradeLabel][t]) {
        grouped[currentGradeLabel][t] = { mMaths: null, sMaths: null, mScience: null, sScience: null, app: [], assign: [], baseline: [] };
      }
    });
  }

  const grades = [...GRADE_ORDER, ...Object.keys(grouped).filter(g => !GRADE_ORDER.includes(g))].filter(g => grouped[g]);

  // Extract year from grade label e.g. "Grade 9 (2024)" → 2024
  const yearOf = (grade: string) => parseInt(grade.match(/\((\d{4})\)/)?.[1] ?? String(new Date().getFullYear()));
  const gradeNumOf = (grade: string) => parseInt(grade.match(/Grade (\d+)/)?.[1] ?? '9');

  // Build a slot descriptor for a chip (used when adding a missing mark)
  const makeSlot = (grade: string, termKey: string, source: 'Melisizwe'|'School', subject: 'Mathematics'|'Science') => {
    const yr    = yearOf(grade);
    const grNum = gradeNumOf(grade);
    const tNum  = termKey === 'none' ? null : Number(termKey);
    const cat   = tNum === null ? 'Baseline' : `Term ${tNum}` as any;
    const label = cat === 'Baseline'
      ? `${source} ${subject} Baseline (Grade ${grNum} (${yr}))`
      : `${source} ${subject} — Term ${tNum} (Grade ${grNum} (${yr}))`;
    const date  = TERM_DATES[termKey] ? TERM_DATES[termKey].replace(/^\d{4}/, String(yr)) : `${yr}-01-01`;
    return { subject, notesLabel: label, term: tNum, assessType: tNum === null ? 'other' : 'test', date };
  };

  // Determine programId to use (prefer one from existing assessments in this learner)
  const resolvedProgramId = (assessments[0] as any)?.program_id ?? programId;

  return (
    <div className="space-y-6">
      {grades.map(grade => {
        const terms = grouped[grade];
        const termKeys = Object.keys(terms).sort((a, b) => {
          if (a === 'none') return -1; if (b === 'none') return 1;
          return Number(a) - Number(b);
        });

        const allBaselines = termKeys.flatMap(t => terms[t].baseline);
        const allApp       = termKeys.flatMap(t => terms[t].app);
        const allAssign    = termKeys.flatMap(t => terms[t].assign);

        // Determine all terms that should be shown (existing + all T1-T4)
        const allTermKeys = Array.from(new Set([...termKeys.filter(t => t !== 'none'), '1','2','3','4']))
          .sort((a,b) => Number(a)-Number(b));

        return (
          <div key={grade}>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: DS.primary }}>{grade}</h3>
              <div className="flex-1 h-px" style={{ background: DS.border }} />
            </div>

            <div className="space-y-3">
              {/* Baselines */}
              {allBaselines.length > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${DS.border}` }}>
                  <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: DS.surfaceHover, color: DS.textMuted, borderBottom: `1px solid ${DS.border}` }}>
                    Baseline Assessments
                  </div>
                  <div className="p-3 flex gap-3 flex-wrap" style={{ background: DS.surface }}>
                    {allBaselines.map((a, i) => {
                      const shortLabel = (a.notes ?? '').replace(/ \(Grade.*$/, '').replace('Melisizwe ','M. ');
                      const src = (a.notes ?? '').startsWith('Melisizwe') ? 'Melisizwe' : 'School';
                      const subj = a.subject as 'Mathematics'|'Science';
                      return <ScoreChip key={i} label={shortLabel} assessment={a}
                        slot={makeSlot(grade, 'none', src as any, subj)}
                        learnerId={learnerId} programId={resolvedProgramId}
                        onSaved={handleSaved} onDeleted={handleDeleted} />;
                    })}
                  </div>
                </div>
              )}

              {/* Application marks */}
              {allApp.length > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${DS.border}` }}>
                  <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: DS.surfaceHover, color: DS.textMuted, borderBottom: `1px solid ${DS.border}` }}>
                    Application Marks
                  </div>
                  <div className="p-3 flex gap-3 flex-wrap" style={{ background: DS.surface }}>
                    {allApp.map((a, i) => (
                      <ScoreChip key={i} label={a.subject} assessment={a}
                        slot={{ subject: a.subject, notesLabel: a.notes ?? '', term: null, assessType: 'quiz', date: a.assessment_date ?? '' }}
                        learnerId={learnerId} programId={resolvedProgramId}
                        onSaved={handleSaved} onDeleted={handleDeleted} />
                    ))}
                  </div>
                </div>
              )}

              {/* Terms T1–T4 — always show all 4, empty ones get a + chip */}
              {allTermKeys.map(t => {
                const td = terms[t] ?? { mMaths: null, sMaths: null, mScience: null, sScience: null };
                return (
                  <div key={t} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${DS.border}` }}>
                    <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: DS.surfaceHover, color: DS.textMuted, borderBottom: `1px solid ${DS.border}` }}>
                      {TERM_LABELS[t]}
                    </div>
                    <div className="p-3 space-y-2" style={{ background: DS.surface }}>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: DS.textMuted }}>Mathematics</p>
                        <div className="flex gap-2">
                          <ScoreChip label="Melisizwe" assessment={td.mMaths}
                            slot={makeSlot(grade, t, 'Melisizwe', 'Mathematics')}
                            learnerId={learnerId} programId={resolvedProgramId}
                            onSaved={handleSaved} onDeleted={handleDeleted} />
                          <ScoreChip label="School" assessment={td.sMaths}
                            slot={makeSlot(grade, t, 'School', 'Mathematics')}
                            learnerId={learnerId} programId={resolvedProgramId}
                            onSaved={handleSaved} onDeleted={handleDeleted} />
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: DS.textMuted }}>Science</p>
                        <div className="flex gap-2">
                          <ScoreChip label="Melisizwe" assessment={td.mScience}
                            slot={makeSlot(grade, t, 'Melisizwe', 'Science')}
                            learnerId={learnerId} programId={resolvedProgramId}
                            onSaved={handleSaved} onDeleted={handleDeleted} />
                          <ScoreChip label="School" assessment={td.sScience}
                            slot={makeSlot(grade, t, 'School', 'Science')}
                            learnerId={learnerId} programId={resolvedProgramId}
                            onSaved={handleSaved} onDeleted={handleDeleted} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Assignments */}
              {allAssign.length > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${DS.border}` }}>
                  <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: DS.surfaceHover, color: DS.textMuted, borderBottom: `1px solid ${DS.border}` }}>
                    Assignments
                  </div>
                  <div className="p-3 flex gap-3 flex-wrap" style={{ background: DS.surface }}>
                    {allAssign.map((a, i) => {
                      const shortLabel = (a.notes ?? '').replace(/ \(Grade.*$/, '').replace('June ','');
                      return <ScoreChip key={i} label={shortLabel} assessment={a}
                        slot={{ subject: a.subject, notesLabel: a.notes ?? '', term: 2, assessType: 'assignment', date: a.assessment_date ?? '' }}
                        learnerId={learnerId} programId={resolvedProgramId}
                        onSaved={handleSaved} onDeleted={handleDeleted} />;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
