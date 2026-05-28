'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, Plus, Trash2, Download } from 'lucide-react';

interface Program  { program_id: string; program_name: string }
interface Learner  { learner_id: string; full_name: string; learner_code: string }
interface Row      { learner_id: string; full_name: string; learner_code: string; score: string; notes: string }

const SUBJECTS = ['Coding','Robotics','Mathematics','Science','Design','Electronics','AI/ML','Project Work','Other'];

export default function TeacherAssessmentsPage() {
  const [programs,     setPrograms]     = useState<Program[]>([]);
  const [programId,    setProgramId]    = useState('');
  const [subject,      setSubject]      = useState('');
  const [maxScore,     setMaxScore]     = useState('100');
  const [date,         setDate]         = useState(new Date().toISOString().slice(0, 10));
  const [rows,         setRows]         = useState<Row[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [loadingLrn,   setLoadingLrn]   = useState(false);
  const [saved,        setSaved]        = useState(false);

  useEffect(() => {
    fetch('/api/v1/programs?limit=100')
      .then(r => r.json())
      .then(j => setPrograms(j.data || []));
  }, []);

  useEffect(() => {
    if (!programId) { setRows([]); return; }
    setLoadingLrn(true);
    fetch(`/api/v1/programs/${programId}/learners`)
      .then(r => r.json())
      .then(j => {
        setRows((j.data || []).map((l: Learner) => ({
          learner_id:   l.learner_id,
          full_name:    l.full_name,
          learner_code: l.learner_code,
          score:        '',
          notes:        '',
        })));
      })
      .finally(() => setLoadingLrn(false));
  }, [programId]);

  const setRow = (id: string, field: 'score'|'notes', value: string) =>
    setRows(prev => prev.map(r => r.learner_id === id ? { ...r, [field]: value } : r));

  const fillAll = (score: string) =>
    setRows(prev => prev.map(r => ({ ...r, score })));

  const pct = (score: string) => {
    const s = Number(score), m = Number(maxScore);
    if (!score || isNaN(s) || isNaN(m) || m === 0) return null;
    return Math.round((s / m) * 100);
  };

  const gradeBand = (p: number | null) => {
    if (p === null) return null;
    if (p >= 80) return 'Distinction';
    if (p >= 70) return 'Merit';
    if (p >= 50) return 'Pass';
    return 'Needs Support';
  };

  const handleSave = async () => {
    if (!programId)   { toast.error('Select a programme'); return; }
    if (!subject)     { toast.error('Enter a subject');    return; }
    if (!maxScore || isNaN(Number(maxScore))) { toast.error('Enter max score'); return; }

    const toSave = rows.filter(r => r.score.trim() !== '');
    if (!toSave.length) { toast.error('Enter at least one score'); return; }

    setLoading(true);
    try {
      const records = toSave.map(r => {
        const p = pct(r.score);
        return {
          learner_id:      r.learner_id,
          program_id:      programId,
          subject,
          score:           Number(r.score),
          max_score:       Number(maxScore),
          percentage:      p,
          grade_band:      gradeBand(p),
          assessment_date: date,
          notes:           r.notes || undefined,
        };
      });

      // Save one by one (bulk assessment insert)
      let count = 0;
      for (const rec of records) {
        const res = await fetch('/api/v1/assessments', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(rec),
        });
        if (res.ok) count++;
      }

      toast.success(`${count} assessment${count !== 1 ? 's' : ''} saved`);
      setSaved(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Learner Code','Name','Score',`Max (${maxScore})`,'%','Grade Band'];
    const data    = rows.map(r => {
      const p = pct(r.score);
      return [r.learner_code, r.full_name, r.score, maxScore, p ?? '', gradeBand(p) ?? ''];
    });
    const csv  = [headers, ...data].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `marks_${subject}_${date}.csv`;
    a.click();
  };

  if (saved) return (
    <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="w-14 h-14 rounded-full bg-mint-400/20 flex items-center justify-center mx-auto mb-4">
        <Save className="w-7 h-7 text-mint-600" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Marks Saved!</h3>
      <p className="text-gray-500 text-sm mb-6">All scores have been recorded successfully.</p>
      <button onClick={() => { setSaved(false); setRows(prev => prev.map(r => ({...r, score:'', notes:''}))); }}
        className="btn-primary">
        Capture Another Assessment
      </button>
    </div>
  );

  const filledCount = rows.filter(r => r.score.trim()).length;
  const classAvg    = filledCount > 0
    ? Math.round(rows.filter(r => r.score).reduce((s, r) => s + (pct(r.score) || 0), 0) / filledCount)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Capture Marks</h1>
        <p className="text-sm text-gray-500 mt-0.5">Record assessment scores for your learners</p>
      </div>

      {/* Assessment setup */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Assessment Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Programme <span className="text-red-500">*</span></label>
            <select value={programId} onChange={e => setProgramId(e.target.value)} className="form-select">
              <option value="">Select programme…</option>
              {programs.map(p => <option key={p.program_id} value={p.program_id}>{p.program_name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Subject <span className="text-red-500">*</span></label>
            <select value={subject} onChange={e => setSubject(e.target.value)} className="form-select">
              <option value="">Select subject…</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Assessment Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="form-input" />
          </div>
          <div>
            <label className="form-label">Total Marks (out of)</label>
            <input type="number" value={maxScore} onChange={e => setMaxScore(e.target.value)}
              className="form-input" min={1} max={1000} placeholder="100" />
          </div>
        </div>
      </div>

      {/* Marks table */}
      {programId && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-gray-800">
                {rows.length} Learners
              </h2>
              {classAvg !== null && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  classAvg >= 70 ? 'bg-mint-400/10 text-mint-700' :
                  classAvg >= 50 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                }`}>
                  Class avg: {classAvg}%
                </span>
              )}
              <span className="text-xs text-gray-400">{filledCount} entered</span>
            </div>
            <div className="flex gap-2">
              <button onClick={exportCSV} className="btn-secondary text-xs" disabled={!filledCount}>
                <Download className="w-3.5 h-3.5" /> Export
              </button>
              <button onClick={() => fillAll(maxScore)} className="btn-secondary text-xs">
                Mark all full
              </button>
              <button onClick={() => fillAll('')} className="btn-secondary text-xs">
                Clear all
              </button>
            </div>
          </div>

          {loadingLrn ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No learners enrolled in this programme.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Learner</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 w-32">
                    Score / {maxScore}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 w-20">%</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 w-28">Grade</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 hidden sm:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const p = pct(r.score);
                  const g = gradeBand(p);
                  const scoreColor = p === null ? 'text-gray-400' : p >= 70 ? 'text-mint-600' : p >= 50 ? 'text-yellow-600' : 'text-red-600';
                  return (
                    <tr key={r.learner_id} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-800">{r.full_name}</p>
                        <p className="text-xs text-gray-400 font-mono">{r.learner_code}</p>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number" value={r.score} min={0} max={Number(maxScore)}
                          onChange={e => setRow(r.learner_id, 'score', e.target.value)}
                          placeholder="—"
                          className="w-20 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 font-mono" />
                      </td>
                      <td className={`px-4 py-3 font-mono font-semibold text-sm ${scoreColor}`}>
                        {p !== null ? `${p}%` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {g ? (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            g === 'Distinction'   ? 'bg-mint-400/10 text-mint-700' :
                            g === 'Merit'         ? 'bg-blue-50 text-blue-700' :
                            g === 'Pass'          ? 'bg-yellow-50 text-yellow-700' :
                            'bg-red-50 text-red-700'
                          }`}>{g}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <input type="text" value={r.notes}
                          onChange={e => setRow(r.learner_id, 'notes', e.target.value)}
                          placeholder="Optional…"
                          className="w-full text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400 max-w-xs" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {rows.length > 0 && (
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {filledCount} of {rows.length} scores entered
                {classAvg !== null && ` · Class average: ${classAvg}%`}
              </p>
              <button onClick={handleSave} disabled={loading || !filledCount} className="btn-primary">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {loading ? 'Saving…' : `Save ${filledCount} Mark${filledCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
