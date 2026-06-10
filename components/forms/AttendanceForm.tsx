'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { today } from '@/utils';
import { DS } from '@/components/platform/tokens';

// ── Dark-mode programme combobox ──────────────────────────────────────────────
function ProgramCombobox({
  programs, value, onChange,
}: {
  programs: Array<{ program_id: string; program_name: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState('');
  const [pos,     setPos]     = useState({ top: 0, left: 0, width: 0 });
  const triggerRef            = useRef<HTMLDivElement>(null);
  const panelRef              = useRef<HTMLDivElement>(null);

  const selected = programs.find(p => p.program_id === value);
  const filtered = query.trim()
    ? programs.filter(p => p.program_name.toLowerCase().includes(query.toLowerCase()))
    : programs;

  const openDropdown = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (!triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [open]);

  const triggerSt: React.CSSProperties = {
    background: DS.surfaceHover as string,
    border: `1px solid ${open ? DS.primary : DS.border}`,
    borderRadius: '12px', padding: '10px 14px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    transition: 'border-color 0.15s',
  };

  const panel = open ? createPortal(
    <div ref={panelRef} style={{
      position: 'fixed', top: pos.top, left: pos.left, width: pos.width,
      zIndex: 9999, background: '#1a1330',
      border: `1px solid ${DS.border}`, borderRadius: '12px',
      boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
      maxHeight: '280px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Search */}
      <div className="p-2 border-b" style={{ borderColor: DS.border }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: DS.textMuted }} />
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search programme…"
            className="w-full text-sm pl-8 pr-8 py-1.5 rounded-lg outline-none"
            style={{ background: 'rgba(255,255,255,0.08)', color: DS.text as string, border: `1px solid ${DS.border}` }} />
          {query && (
            <button aria-label="Clear search" onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: DS.textMuted }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {/* Options */}
      <div className="overflow-y-auto" role="listbox">
        {filtered.length === 0
          ? <p className="text-sm text-center py-5" style={{ color: DS.textMuted }}>No programmes found</p>
          : filtered.map(p => (
            <div key={p.program_id} role="option" aria-selected={p.program_id === value}
              onClick={() => { onChange(p.program_id); setOpen(false); setQuery(''); }}
              className="px-4 py-2.5 cursor-pointer text-sm font-medium"
              style={{
                background: p.program_id === value ? DS.primaryLight as string : 'transparent',
                color: p.program_id === value ? DS.primary as string : DS.text as string,
              }}
              onMouseOver={e => { if (p.program_id !== value) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseOut={e =>  { if (p.program_id !== value) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
              {p.program_name}
            </div>
          ))}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div ref={triggerRef}>
      <div style={triggerSt} onClick={open ? () => setOpen(false) : openDropdown}
        role="combobox" aria-expanded={open} aria-haspopup="listbox" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') open ? setOpen(false) : openDropdown(); }}>
        <span className="text-sm truncate" style={{ color: selected ? DS.text as string : DS.textMuted as string }}>
          {selected ? selected.program_name : 'Select programme…'}
        </span>
        {open ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: DS.textMuted }} />
               : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: DS.textMuted }} />}
      </div>
      {panel}
    </div>
  );
}

const schema = z.object({
  program_id:   z.string().min(1, 'Select a programme'),
  session_date: z.string().min(1, 'Select a date'),
  captured_by:  z.string().min(1),
});
type FormData = z.infer<typeof schema>;

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface AttendanceEntry {
  learner_id:  string;
  full_name:   string;
  grade:       number;
  school_name: string;
  status:      AttendanceStatus;
  notes:       string;
}

interface Props {
  programs:      Array<{ program_id: string; program_name: string }>;
  currentUserId: string;
  onSuccess?:    () => void;
}

const STATUS_OPTIONS: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];

// DS-aware status config
const STATUS_CFG: Record<AttendanceStatus, { color: string; bg: string; border: string; symbol: string }> = {
  present: { color: 'var(--ds-success)', bg: 'var(--ds-success-light)', border: 'var(--ds-success)', symbol: '✓' },
  absent:  { color: 'var(--ds-danger)',  bg: 'var(--ds-danger-light)',  border: 'var(--ds-danger)',  symbol: '✗' },
  late:    { color: 'var(--ds-warn)',    bg: 'var(--ds-warn-light)',    border: 'var(--ds-warn)',    symbol: '~' },
  excused: { color: '#818CF8',           bg: 'rgba(129,140,248,0.15)', border: '#818CF8',           symbol: 'E' },
};

// Grade colour palette — bright accent colours that work on both themes
const GRADE_PALETTE: Record<number, { accent: string; bg: string; text: string }> = {
  8:  { accent: '#F59E0B', bg: 'rgba(245,158,11,0.15)',  text: '#F59E0B' },
  9:  { accent: '#EC4899', bg: 'rgba(236,72,153,0.15)',  text: '#EC4899' },
  10: { accent: '#7C3AED', bg: 'rgba(124,58,237,0.15)',  text: '#A78BFA' },
  11: { accent: '#10B981', bg: 'rgba(16,185,129,0.15)',  text: '#34D399' },
  12: { accent: '#3B82F6', bg: 'rgba(59,130,246,0.15)',  text: '#60A5FA' },
};
const fallbackPalette = { accent: '#94A3B8', bg: 'rgba(148,163,184,0.15)', text: '#94A3B8' };
const getPalette = (grade: number) => GRADE_PALETTE[grade] || fallbackPalette;

export default function AttendanceForm({ programs, currentUserId, onSuccess }: Props) {
  const [learners,        setLearners]        = useState<AttendanceEntry[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [loadingLearners, setLoadingLearners] = useState(false);
  const [submitted,       setSubmitted]       = useState(false);
  const [savedGrades,     setSavedGrades]     = useState<Set<number | 'all'>>(new Set());
  const [activeGrade,     setActiveGrade]     = useState<number | 'all'>('all');

  const { register, watch, setValue, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { session_date: today(), captured_by: currentUserId },
  });

  const programId = watch('program_id');

  useEffect(() => {
    if (!programId) { setLearners([]); return; }
    setLoadingLearners(true);
    setActiveGrade('all');
    setSavedGrades(new Set());
    fetch(`/api/v1/programs/${programId}/learners`)
      .then(r => r.json())
      .then(({ data }: { data: any[] }) => {
        setLearners((data || []).map((l: any) => ({
          learner_id:  l.learner_id,
          full_name:   l.full_name || `${l.first_name ?? ''} ${l.last_name ?? ''}`.trim(),
          grade:       l.grade || 0,
          school_name: l.school_name || '',
          status:      'present' as AttendanceStatus,
          notes:       '',
        })));
      })
      .finally(() => setLoadingLearners(false));
  }, [programId]);

  const grades = Array.from(new Set(learners.map(l => l.grade))).sort((a, b) => a - b);
  const visibleLearners = activeGrade === 'all' ? learners : learners.filter(l => l.grade === activeGrade);

  const setStatus = (id: string, status: AttendanceStatus) =>
    setLearners(prev => prev.map(l => l.learner_id === id ? { ...l, status } : l));
  const setNotes  = (id: string, notes: string) =>
    setLearners(prev => prev.map(l => l.learner_id === id ? { ...l, notes } : l));
  const markGroup = (status: AttendanceStatus, grade?: number) =>
    setLearners(prev => prev.map(l => (grade === undefined || l.grade === grade) ? { ...l, status } : l));

  const statsFor = (group: AttendanceEntry[]) => ({
    present: group.filter(l => l.status === 'present').length,
    absent:  group.filter(l => l.status === 'absent').length,
    late:    group.filter(l => l.status === 'late').length,
    excused: group.filter(l => l.status === 'excused').length,
  });
  const totalStats   = statsFor(learners);
  const visibleStats = statsFor(visibleLearners);

  const onSubmit = async (data: FormData) => {
    if (!learners.length) { toast.error('No learners loaded'); return; }
    const toSave = activeGrade === 'all' ? learners : learners.filter(l => l.grade === activeGrade);
    if (!toSave.length) { toast.error('No learners in this grade'); return; }
    const gradeLabel = activeGrade === 'all' ? 'all grades' : `Grade ${activeGrade}`;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/attendance/bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_id: data.program_id, session_date: data.session_date, captured_by: data.captured_by,
          records: toSave.map(l => ({ learner_id: l.learner_id, status: l.status, notes: l.notes || undefined })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');
      toast.success(`Attendance saved — ${toSave.length} learners (${gradeLabel})`);
      setSavedGrades(prev => { const s = new Set(prev); s.add(activeGrade); return s; });
      if (activeGrade !== 'all') {
        const nextGrade = grades[grades.indexOf(activeGrade as number) + 1];
        if (nextGrade !== undefined) { setActiveGrade(nextGrade); toast.info(`Now on Grade ${nextGrade}`); }
        else { setSubmitted(true); onSuccess?.(); }
      } else { setSubmitted(true); onSuccess?.(); }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save attendance');
    } finally { setLoading(false); }
  };

  if (submitted) return (
    <div className="text-center py-12">
      <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--ds-success)' }} />
      <h3 className="text-lg font-semibold" style={{ color: DS.text }}>Attendance saved</h3>
      <p className="text-sm mt-1" style={{ color: DS.textMuted }}>{learners.length} records captured</p>
      <button onClick={() => { setSubmitted(false); setActiveGrade('all'); setSavedGrades(new Set()); }}
        className="btn-secondary mt-4">
        Capture another session
      </button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {/* Session setup */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Programme <span style={{ color: 'var(--ds-danger)' }}>*</span></label>
          <ProgramCombobox
            programs={programs}
            value={programId || ''}
            onChange={id => setValue('program_id', id, { shouldValidate: true })}
          />
          {errors.program_id && <p className="form-error">{errors.program_id.message}</p>}
        </div>
        <div>
          <label className="form-label">Session Date <span style={{ color: 'var(--ds-danger)' }}>*</span></label>
          <input type="date" {...register('session_date')} className="form-input" />
          {errors.session_date && <p className="form-error">{errors.session_date.message}</p>}
        </div>
      </div>

      {programId && (
        <div className="space-y-4">

          {/* Overall summary bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 rounded-xl px-4 py-3"
            style={{ background: DS.surfaceHover, border: `1px solid ${DS.border}` }}>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(totalStats) as [AttendanceStatus, number][]).map(([k, v]) => {
                const c = STATUS_CFG[k];
                return (
                  <span key={k} className="text-xs font-bold px-2.5 py-1 rounded-full capitalize"
                    style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
                    {v} {k}
                  </span>
                );
              })}
              <span className="text-xs self-center" style={{ color: DS.textMuted }}>
                · {learners.length} total
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs mr-1" style={{ color: DS.textMuted }}>Mark all:</span>
              {STATUS_OPTIONS.map(s => {
                const c = STATUS_CFG[s];
                return (
                  <button type="button" key={s} onClick={() => markGroup(s)}
                    className="text-xs font-bold px-2.5 py-1 rounded-full capitalize cursor-pointer transition-opacity hover:opacity-80"
                    style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
                    {c.symbol} {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grade tabs */}
          {loadingLearners ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin" style={{ color: DS.primary }} />
            </div>
          ) : grades.length > 0 ? (
            <>
              {/* Tab strip */}
              <div className="flex flex-wrap gap-2">
                {/* ALL tab */}
                <button type="button" onClick={() => setActiveGrade('all')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all cursor-pointer"
                  style={{
                    borderColor: activeGrade === 'all' ? DS.primary : DS.border,
                    background:  activeGrade === 'all' ? DS.primary : DS.surfaceHover,
                    color:       activeGrade === 'all' ? '#fff'      : DS.textMid as string,
                    transform:   activeGrade === 'all' ? 'translateY(-1px)' : 'none',
                  }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: activeGrade === 'all' ? '#fff' : DS.primary }} />
                  All Grades
                  <span className="text-xs font-bold rounded-full px-1.5 py-0.5"
                    style={{ background: activeGrade === 'all' ? 'rgba(255,255,255,0.2)' : DS.border, color: activeGrade === 'all' ? '#fff' : DS.textMid as string }}>
                    {learners.length}
                  </span>
                </button>

                {/* Grade tabs */}
                {grades.map(grade => {
                  const pal      = getPalette(grade);
                  const count    = learners.filter(l => l.grade === grade).length;
                  const present  = learners.filter(l => l.grade === grade && l.status === 'present').length;
                  const isActive = activeGrade === grade;
                  const isSaved  = savedGrades.has(grade);
                  return (
                    <button key={grade} type="button" onClick={() => setActiveGrade(grade)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all cursor-pointer"
                      style={{
                        borderColor: isActive ? pal.accent : isSaved ? pal.accent : DS.border,
                        background:  isActive ? pal.accent : pal.bg,
                        color:       isActive ? '#fff'     : pal.text,
                        transform:   isActive ? 'translateY(-1px)' : 'none',
                        opacity:     isSaved && !isActive ? 0.85 : 1,
                      }}>
                      {isSaved && !isActive
                        ? <span style={{ color: pal.accent }}>✓</span>
                        : <span className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: isActive ? 'rgba(255,255,255,0.7)' : pal.accent }} />}
                      Grade {grade}
                      <span className="text-xs font-bold rounded-full px-1.5 py-0.5"
                        style={{ background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)', color: isActive ? '#fff' : pal.text }}>
                        {count}
                      </span>
                      {count > 0 && (
                        <span className="text-xs rounded-full px-1.5 py-0.5 font-medium"
                          style={{ background: 'rgba(255,255,255,0.15)', color: isActive ? '#fff' : pal.text }}>
                          ✓{present}
                        </span>
                      )}
                      {isSaved && (
                        <span className="text-xs font-bold rounded-full px-1.5 py-0.5"
                          style={{ background: 'rgba(255,255,255,0.2)', color: isActive ? '#fff' : pal.accent }}>
                          Saved
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Register table */}
              <div className="rounded-xl overflow-hidden border-2"
                style={{ borderColor: activeGrade === 'all' ? DS.primaryBorder : getPalette(activeGrade as number).accent }}>

                {/* Table header */}
                <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2 border-b"
                  style={{
                    background:   activeGrade === 'all' ? DS.primaryLight : getPalette(activeGrade as number).bg,
                    borderColor:  activeGrade === 'all' ? DS.primaryBorder : getPalette(activeGrade as number).accent,
                  }}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold"
                      style={{ color: activeGrade === 'all' ? DS.primary : getPalette(activeGrade as number).text }}>
                      {activeGrade === 'all' ? 'All Grades' : `Grade ${activeGrade}`}
                    </span>
                    <span className="text-xs" style={{ color: DS.textMuted }}>
                      {visibleLearners.length} learner{visibleLearners.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs font-medium" style={{ color: 'var(--ds-success)' }}>
                      {visibleStats.present} present
                    </span>
                    {visibleStats.absent > 0 && (
                      <span className="text-xs font-medium" style={{ color: 'var(--ds-danger)' }}>
                        {visibleStats.absent} absent
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs" style={{ color: DS.textMuted }}>
                      Mark {activeGrade === 'all' ? 'all' : `Gr ${activeGrade}`}:
                    </span>
                    {STATUS_OPTIONS.map(s => {
                      const c = STATUS_CFG[s];
                      return (
                        <button type="button" key={s}
                          onClick={() => markGroup(s, activeGrade === 'all' ? undefined : activeGrade as number)}
                          className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer"
                          style={{ background: c.bg, color: c.color, borderColor: c.border }}>
                          {c.symbol} {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Learner rows */}
                <table className="w-full" style={{ background: DS.surface }}>
                  <thead>
                    <tr style={{ background: DS.surfaceHover as string }}>
                      {['#', 'Learner', ...(activeGrade === 'all' ? ['Grade'] : []), 'School', 'Status', 'Notes']
                        .map(h => (
                          <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: DS.textMuted }}>{h}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleLearners.map((l, i) => {
                      const pal = getPalette(l.grade);
                      return (
                        <tr key={l.learner_id}
                          style={{ borderTop: `1px solid ${DS.borderLight}` }}
                          onMouseOver={e => { (e.currentTarget as HTMLTableRowElement).style.background = DS.surfaceHover as string; }}
                          onMouseOut={e =>  { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}>
                          <td className="px-4 py-3 text-xs" style={{ color: DS.textMuted }}>{i + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {activeGrade === 'all' && (
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: pal.accent }} />
                              )}
                              <span className="font-medium text-sm" style={{ color: DS.text }}>{l.full_name}</span>
                            </div>
                          </td>
                          {activeGrade === 'all' && (
                            <td className="px-4 py-3">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: pal.bg, color: pal.text }}>
                                Gr {l.grade}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3 text-xs" style={{ color: DS.textMuted }}>{l.school_name || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5 flex-wrap">
                              {STATUS_OPTIONS.map(s => {
                                const c   = STATUS_CFG[s];
                                const sel = l.status === s;
                                return (
                                  <button type="button" key={s} onClick={() => setStatus(l.learner_id, s)}
                                    className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer"
                                    style={sel
                                      ? { background: c.bg, color: c.color, borderColor: c.border }
                                      : { background: 'transparent', color: DS.textMuted as string, borderColor: DS.border }}>
                                    {c.symbol} {s}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input type="text" placeholder="Optional note…" value={l.notes}
                              onChange={e => setNotes(l.learner_id, e.target.value)}
                              className="text-xs rounded px-2 py-1 w-full max-w-xs outline-none"
                              style={{
                                background: DS.surfaceHover as string, color: DS.text as string,
                                border: `1px solid ${DS.border}`,
                              }} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : !loadingLearners && (
            <div className="text-center py-12 rounded-xl border-2 border-dashed text-sm"
              style={{ borderColor: DS.border, color: DS.textMuted }}>
              No learners enrolled in this programme yet.
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button type="submit" disabled={loading || !visibleLearners.length} className="btn-primary">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading
            ? 'Saving…'
            : activeGrade === 'all'
              ? `Save All Grades (${learners.length} learners)`
              : `Save Grade ${activeGrade} (${visibleLearners.length} learners)`}
        </button>
        {!programId && (
          <p className="text-sm" style={{ color: DS.textMuted }}>Select a programme to load the register</p>
        )}
        {savedGrades.size > 0 && activeGrade !== 'all' && (
          <p className="text-xs font-medium" style={{ color: 'var(--ds-success)' }}>
            ✓ Saved: {Array.from(savedGrades.values()).filter(g => g !== 'all').map(g => `Grade ${g}`).join(', ')}
          </p>
        )}
      </div>
    </form>
  );
}
