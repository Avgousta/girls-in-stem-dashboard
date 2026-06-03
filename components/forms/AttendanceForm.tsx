'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { cn, today } from '@/utils';
import type { Learner, AttendanceStatus } from '@/types';

const schema = z.object({
  program_id:   z.string().min(1, 'Select a programme'),
  session_date: z.string().min(1, 'Select a date'),
  captured_by:  z.string().min(1),
});

type FormData = z.infer<typeof schema>;

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

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'border-mint-400 bg-mint-400/10 text-mint-700',
  absent:  'border-red-400 bg-red-50 text-red-700',
  late:    'border-yellow-400 bg-yellow-50 text-yellow-700',
  excused: 'border-blue-400 bg-blue-50 text-blue-700',
};

// Each grade gets a distinct colour palette — bg, text, border, tab-active bg
const GRADE_PALETTE: Record<number, { bg: string; text: string; border: string; tab: string; dot: string }> = {
  8:  { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D', tab: '#F59E0B', dot: '#F59E0B' }, // amber
  9:  { bg: '#FCE7F3', text: '#9D174D', border: '#F9A8D4', tab: '#EC4899', dot: '#EC4899' }, // pink
  10: { bg: '#EDE9FE', text: '#4C1D95', border: '#C4B5FD', tab: '#7C3AED', dot: '#7C3AED' }, // violet
  11: { bg: '#DCFCE7', text: '#14532D', border: '#86EFAC', tab: '#16A34A', dot: '#16A34A' }, // green
  12: { bg: '#DBEAFE', text: '#1E3A5F', border: '#93C5FD', tab: '#2563EB', dot: '#2563EB' }, // blue
};

const fallbackPalette = { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB', tab: '#6B7280', dot: '#6B7280' };
const getPalette = (grade: number) => GRADE_PALETTE[grade] || fallbackPalette;

export default function AttendanceForm({ programs, currentUserId, onSuccess }: Props) {
  const [learners,        setLearners]        = useState<AttendanceEntry[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [loadingLearners, setLoadingLearners] = useState(false);
  const [submitted,       setSubmitted]       = useState(false);
  const [savedGrades, setSavedGrades] = useState<Set<number | 'all'>>(new Set());
  const [activeGrade, setActiveGrade] = useState<number | 'all'>('all');

  const { register, watch, handleSubmit, formState: { errors } } = useForm<FormData>({
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
      .then(({ data }: { data: Learner[] }) => {
        setLearners((data || []).map(l => ({
          learner_id:  l.learner_id,
          full_name:   l.full_name || `${l.first_name} ${l.last_name}`,
          grade:       l.grade || 0,
          school_name: l.school_name || '',
          status:      'present' as AttendanceStatus,
          notes:       '',
        })));
      })
      .finally(() => setLoadingLearners(false));
  }, [programId]);

  const grades = Array.from(new Set(learners.map(l => l.grade))).sort((a, b) => a - b);

  const visibleLearners = activeGrade === 'all'
    ? learners
    : learners.filter(l => l.grade === activeGrade);

  const setStatus = (id: string, status: AttendanceStatus) =>
    setLearners(prev => prev.map(l => l.learner_id === id ? { ...l, status } : l));

  const setNotes = (id: string, notes: string) =>
    setLearners(prev => prev.map(l => l.learner_id === id ? { ...l, notes } : l));

  const markGroup = (status: AttendanceStatus, grade?: number) =>
    setLearners(prev => prev.map(l =>
      (grade === undefined || l.grade === grade) ? { ...l, status } : l
    ));

  // Stats for visible group
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

    // Only save the learners currently visible in the active tab
    const toSave = activeGrade === 'all'
      ? learners
      : learners.filter(l => l.grade === activeGrade);

    if (!toSave.length) { toast.error('No learners in this grade'); return; }

    const gradeLabel = activeGrade === 'all' ? 'all grades' : `Grade ${activeGrade}`;

    setLoading(true);
    try {
      const res = await fetch('/api/v1/attendance/bulk', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_id:   data.program_id,
          session_date: data.session_date,
          captured_by:  data.captured_by,
          records: toSave.map(l => ({
            learner_id: l.learner_id,
            status:     l.status,
            notes:      l.notes || undefined,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');
      toast.success(`Attendance saved — ${toSave.length} learners (${gradeLabel})`);

      // Mark this grade as saved
      setSavedGrades(prev => new Set([...prev, activeGrade]));

      // If we saved a specific grade, mark those learners as "saved" visually
      // and move to the next grade if one exists
      if (activeGrade !== 'all') {
        const currentIdx  = grades.indexOf(activeGrade as number);
        const nextGrade   = grades[currentIdx + 1];
        if (nextGrade !== undefined) {
          setActiveGrade(nextGrade);
          toast.info(`Now on Grade ${nextGrade}`);
        } else {
          // All grades done
          setSubmitted(true);
          onSuccess?.();
        }
      } else {
        setSubmitted(true);
        onSuccess?.();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save attendance');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) return (
    <div className="text-center py-12">
      <CheckCircle2 className="w-12 h-12 text-mint-400 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-gray-800">Attendance saved</h3>
      <p className="text-gray-500 text-sm mt-1">{learners.length} records captured</p>
      <button onClick={() => { setSubmitted(false); setActiveGrade('all'); setSavedGrades(new Set()); }} className="btn-secondary mt-4">
        Capture another session
      </button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {/* Session setup */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Programme <span className="text-red-500">*</span></label>
          <select {...register('program_id')} className="form-select">
            <option value="">Select programme…</option>
            {programs.map(p => (
              <option key={p.program_id} value={p.program_id}>{p.program_name}</option>
            ))}
          </select>
          {errors.program_id && <p className="form-error">{errors.program_id.message}</p>}
        </div>
        <div>
          <label className="form-label">Session Date <span className="text-red-500">*</span></label>
          <input type="date" {...register('session_date')} className="form-input" />
          {errors.session_date && <p className="form-error">{errors.session_date.message}</p>}
        </div>
      </div>

      {programId && (
        <div className="space-y-4">

          {/* ── Overall summary bar ───────────────────────────────────────── */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {Object.entries(totalStats).map(([k, v]) => (
                <span key={k} className={cn('badge capitalize', STATUS_COLORS[k as AttendanceStatus])}>
                  {v} {k}
                </span>
              ))}
              <span className="text-gray-400 text-xs self-center">· {learners.length} total</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 mr-1">Mark all:</span>
              {STATUS_OPTIONS.map(s => (
                <button type="button" key={s} onClick={() => markGroup(s)}
                  className={cn('badge capitalize cursor-pointer hover:opacity-80', STATUS_COLORS[s])}>
                  {s === 'present' ? '✓' : s === 'absent' ? '✗' : s === 'late' ? '~' : 'E'} {s}
                </button>
              ))}
            </div>
          </div>

          {/* ── Grade tabs ────────────────────────────────────────────────── */}
          {loadingLearners ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-brand-600" />
            </div>
          ) : grades.length > 0 ? (
            <>
              {/* Tab strip */}
              <div className="flex flex-wrap gap-2">
                {/* ALL tab */}
                <button type="button" onClick={() => setActiveGrade('all')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all',
                    activeGrade === 'all'
                      ? 'border-brand-600 text-white shadow-md'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-brand-300'
                  )}
                  style={activeGrade === 'all' ? { background: '#4F2D7F' } : {}}>
                  <span className={cn(
                    'w-2 h-2 rounded-full',
                    activeGrade === 'all' ? 'bg-white' : 'bg-brand-600'
                  )} />
                  All Grades
                  <span className={cn(
                    'ml-1 text-xs font-bold rounded-full px-1.5 py-0.5',
                    activeGrade === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                  )}>
                    {learners.length}
                  </span>
                </button>

                {/* One tab per grade */}
                {grades.map(grade => {
                  const pal      = getPalette(grade);
                  const count    = learners.filter(l => l.grade === grade).length;
                  const present  = learners.filter(l => l.grade === grade && l.status === 'present').length;
                  const isActive = activeGrade === grade;
                  const isSaved  = savedGrades.has(grade);
                  return (
                    <button key={grade} type="button" onClick={() => setActiveGrade(grade)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all shadow-sm hover:shadow-md"
                      style={{
                        borderColor: isActive ? pal.tab   : isSaved ? pal.tab   : pal.border,
                        background:  isActive ? pal.tab   : isSaved ? pal.bg    : pal.bg,
                        color:       isActive ? '#fff'    : pal.text,
                        transform:   isActive ? 'translateY(-1px)' : 'none',
                        opacity:     isSaved && !isActive ? 0.85 : 1,
                      }}>
                      {/* Saved checkmark or colour dot */}
                      {isSaved && !isActive
                        ? <span className="text-sm" style={{ color: pal.tab }}>✓</span>
                        : <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: isActive ? 'rgba(255,255,255,0.7)' : pal.dot }} />
                      }

                      Grade {grade}

                      <span className="text-xs font-bold rounded-full px-1.5 py-0.5"
                        style={{
                          background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)',
                          color:      isActive ? '#fff' : pal.text,
                        }}>
                        {count}
                      </span>

                      {count > 0 && (
                        <span className="text-xs rounded-full px-1.5 py-0.5 font-medium"
                          style={{
                            background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)',
                            color:      isActive ? '#fff' : pal.text,
                          }}>
                          ✓{present}
                        </span>
                      )}

                      {isSaved && (
                        <span className="text-xs font-bold rounded-full px-1.5 py-0.5"
                          style={{
                            background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.7)',
                            color:      isActive ? '#fff' : pal.tab,
                          }}>
                          Saved
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ── Register table for active grade/all ───────────────────── */}
              <div className="border-2 rounded-xl overflow-hidden"
                style={{
                  borderColor: activeGrade === 'all'
                    ? '#C4B5FD'
                    : getPalette(activeGrade as number).border,
                }}>

                {/* Table header row */}
                <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2 border-b"
                  style={{
                    background: activeGrade === 'all'
                      ? '#F5F3FF'
                      : getPalette(activeGrade as number).bg,
                    borderColor: activeGrade === 'all'
                      ? '#C4B5FD'
                      : getPalette(activeGrade as number).border,
                  }}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold"
                      style={{ color: activeGrade === 'all' ? '#4C1D95' : getPalette(activeGrade as number).text }}>
                      {activeGrade === 'all' ? 'All Grades' : `Grade ${activeGrade}`}
                    </span>
                    <span className="text-xs text-gray-500">
                      {visibleLearners.length} learner{visibleLearners.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs font-medium text-mint-600">
                      {visibleStats.present} present
                    </span>
                    {visibleStats.absent > 0 && (
                      <span className="text-xs font-medium text-red-600">
                        {visibleStats.absent} absent
                      </span>
                    )}
                  </div>

                  {/* Mark this group */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Mark {activeGrade === 'all' ? 'all' : `Gr ${activeGrade}`}:</span>
                    {STATUS_OPTIONS.map(s => (
                      <button type="button" key={s}
                        onClick={() => markGroup(s, activeGrade === 'all' ? undefined : activeGrade as number)}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-semibold border transition-all',
                          STATUS_COLORS[s]
                        )}>
                        {s === 'present' ? '✓' : s === 'absent' ? '✗' : s === 'late' ? '~' : 'E'} {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Learner rows */}
                <table className="w-full bg-white">
                  <thead>
                    <tr style={{ background: '#FAFAFA' }}>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 w-8">#</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Learner</th>
                      {activeGrade === 'all' && (
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 hidden sm:table-cell">Grade</th>
                      )}
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 hidden sm:table-cell">School</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 hidden md:table-cell">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleLearners.map((l, i) => {
                      const pal = getPalette(l.grade);
                      return (
                        <tr key={l.learner_id} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {/* Grade colour dot when showing all */}
                              {activeGrade === 'all' && (
                                <span className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ background: pal.dot }} />
                              )}
                              <span className="font-medium text-sm text-gray-800">{l.full_name}</span>
                            </div>
                          </td>
                          {activeGrade === 'all' && (
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: pal.bg, color: pal.text }}>
                                Gr {l.grade}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3 text-xs text-gray-400 hidden sm:table-cell">{l.school_name || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5 flex-wrap">
                              {STATUS_OPTIONS.map(s => (
                                <button type="button" key={s} onClick={() => setStatus(l.learner_id, s)}
                                  className={cn(
                                    'px-2.5 py-1 rounded-full text-xs font-semibold border transition-all',
                                    l.status === s
                                      ? STATUS_COLORS[s]
                                      : 'border-gray-200 text-gray-400 hover:border-gray-300'
                                  )}>
                                  {s === 'present' ? '✓' : s === 'absent' ? '✗' : s === 'late' ? '~' : 'E'} {s}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <input type="text" placeholder="Optional note…" value={l.notes}
                              onChange={e => setNotes(l.learner_id, e.target.value)}
                              className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 w-full max-w-xs focus:outline-none focus:ring-1 focus:ring-brand-400" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : !loadingLearners && (
            <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-xl">
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
        {!programId && <p className="text-sm text-gray-400">Select a programme to load the register</p>}
        {savedGrades.size > 0 && activeGrade !== 'all' && (
          <p className="text-xs text-mint-600 font-medium">
            ✓ Saved: {[...savedGrades].filter(g => g !== 'all').map(g => `Grade ${g}`).join(', ')}
          </p>
        )}
      </div>
    </form>
  );
}
