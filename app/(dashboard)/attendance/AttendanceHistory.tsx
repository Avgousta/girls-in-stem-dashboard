'use client';
import { useState, useEffect, useCallback } from 'react';
import { cn, fmt } from '@/utils';
import { Search, Download, Loader2, ChevronLeft, ChevronRight, Users, CalendarCheck2, X, ArrowLeft } from 'lucide-react';

interface Program { program_id: string; program_name: string }

interface AttendanceRecord {
  attendance_id: string;
  session_date:  string;
  status:        string;
  notes:         string | null;
  learner_name:  string;
  learner_code:  string;
  school_name:   string;
  program_name:  string;
}

interface SessionSummary {
  key:          string;
  session_date: string;
  program_name: string;
  total:   number;
  present: number;
  absent:  number;
  late:    number;
  excused: number;
  rate:    number;
}

const STATUS_COLORS: Record<string, string> = {
  present: 'bg-mint-400/10 text-mint-700 border-mint-400/30',
  absent:  'bg-red-50 text-red-700 border-red-200',
  late:    'bg-yellow-50 text-yellow-700 border-yellow-200',
  excused: 'bg-blue-50 text-blue-700 border-blue-200',
};

interface Props {
  programs:        Program[];
  initialProgram?: string;
  initialFrom?:    string;
  initialTo?:      string;
}

export default function AttendanceHistory({ programs, initialProgram, initialFrom, initialTo }: Props) {
  const today  = new Date().toISOString().slice(0, 10);
  const month1 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [view,       setView]       = useState<'sessions'|'register'>('sessions');
  const [programId,  setProgramId]  = useState(initialProgram || '');
  const [fromDate,   setFromDate]   = useState(initialFrom    || month1);
  const [toDate,     setToDate]     = useState(initialTo      || today);
  const [search,     setSearch]     = useState('');
  const [loading,    setLoading]    = useState(false);
  const [records,    setRecords]    = useState<AttendanceRecord[]>([]);
  const [sessions,   setSessions]   = useState<SessionSummary[]>([]);
  const [page,       setPage]       = useState(1);

  // Selected session for drill-down
  const [selected,   setSelected]   = useState<SessionSummary | null>(null);

  const PAGE_SIZE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(null);
    try {
      const params = new URLSearchParams({ from: fromDate, to: toDate, limit: '500' });
      if (programId) params.set('program_id', programId);
      const res  = await fetch(`/api/v1/attendance/history?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const data: AttendanceRecord[] = json.data || [];
      setRecords(data);

      // Build session summaries
      const sessMap: Record<string, SessionSummary> = {};
      data.forEach(r => {
        const key = `${r.session_date}__${r.program_name}`;
        if (!sessMap[key]) {
          sessMap[key] = { key, session_date: r.session_date, program_name: r.program_name,
            total: 0, present: 0, absent: 0, late: 0, excused: 0, rate: 0 };
        }
        sessMap[key].total++;
        if (r.status in sessMap[key]) (sessMap[key] as any)[r.status]++;
      });
      const sess = Object.values(sessMap)
        .map(s => ({ ...s, rate: s.total ? Math.round(s.present / s.total * 100) : 0 }))
        .sort((a, b) => b.session_date.localeCompare(a.session_date));
      setSessions(sess);
      setPage(1);
    } finally {
      setLoading(false);
    }
  }, [programId, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  // Records for the selected session
  const sessionRecords = selected
    ? records.filter(r => r.session_date === selected.session_date && r.program_name === selected.program_name)
    : [];

  // Filtered full register
  const filtered = records.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.learner_name.toLowerCase().includes(q) ||
           r.learner_code?.toLowerCase().includes(q) ||
           r.school_name?.toLowerCase().includes(q);
  });
  const paged      = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // Summary stats
  const src = selected ? sessionRecords : filtered;
  const total   = src.length;
  const present = src.filter(r => r.status === 'present').length;
  const absent  = src.filter(r => r.status === 'absent').length;
  const late    = src.filter(r => r.status === 'late').length;
  const rate    = total ? Math.round(present / total * 100) : 0;

  // Export CSV
  const exportCSV = () => {
    const rows = (selected ? sessionRecords : filtered);
    const headers = ['Date','Learner','Code','School','Programme','Status','Notes'];
    const csv = [headers, ...rows.map(r => [
      r.session_date, r.learner_name, r.learner_code,
      r.school_name, r.program_name, r.status, r.notes || '',
    ])].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = selected
      ? `attendance_${selected.session_date}_${selected.program_name.replace(/\s+/g,'_')}.csv`
      : `attendance_${fromDate}_to_${toDate}.csv`;
    a.click();
  };

  // ── Session detail panel ──────────────────────────────────────────────────
  if (selected) {
    const byStatus = (s: string) => sessionRecords.filter(r => r.status === s);
    return (
      <div className="space-y-5">
        {/* Back + header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <button onClick={() => setSelected(null)}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2">
              <ArrowLeft className="w-4 h-4" /> Back to Sessions
            </button>
            <h2 className="text-xl font-bold text-gray-900">{fmt.date(selected.session_date)}</h2>
            <p className="text-sm text-gray-500">{selected.program_name}</p>
          </div>
          <button onClick={exportCSV} className="btn-secondary text-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* Session stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'Total',    value: selected.total,   color: 'text-gray-800' },
            { label: 'Present',  value: selected.present, color: 'text-mint-600' },
            { label: 'Absent',   value: selected.absent,  color: 'text-red-600' },
            { label: 'Late',     value: selected.late,    color: 'text-yellow-600' },
            { label: 'Rate',     value: `${selected.rate}%`,
              color: selected.rate >= 75 ? 'text-mint-600' : 'text-red-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Attendance list */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Attendance Register — {sessionRecords.length} learners</h3>
          </div>

          {sessionRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No records for this session.</div>
          ) : (
            <table className="w-full data-table">
              <thead>
                <tr key="hdr">
                  <th key="n">#</th>
                  <th key="name">Learner</th>
                  <th key="code">Code</th>
                  <th key="school">School</th>
                  <th key="status">Status</th>
                  <th key="notes">Notes</th>
                </tr>
              </thead>
              <tbody>
                {/* Group by status — present first */}
                {(['present','late','excused','absent'] as const).map(status => {
                  const group = byStatus(status);
                  if (!group.length) return null;
                  return group.map((r, i) => (
                    <tr key={r.attendance_id || `${status}-${i}`}
                      className={status === 'absent' ? 'bg-red-50/40' : ''}>
                      <td key="n" className="text-xs text-gray-400 font-mono">
                        {sessionRecords.indexOf(r) + 1}
                      </td>
                      <td key="name" className="font-medium text-gray-900">{r.learner_name}</td>
                      <td key="code" className="font-mono text-xs text-gray-400">{r.learner_code}</td>
                      <td key="school" className="text-xs text-gray-500">{r.school_name}</td>
                      <td key="status">
                        <span className={cn('badge capitalize border', STATUS_COLORS[r.status])}>
                          {r.status === 'present' ? '✓' : r.status === 'absent' ? '✗' : r.status === 'late' ? '~' : 'E'} {r.status}
                        </span>
                      </td>
                      <td key="notes" className="text-xs text-gray-400">{r.notes || '—'}</td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Absent learners callout */}
        {selected.absent > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-2">
              ✗ Absent ({selected.absent})
            </h3>
            <div className="flex flex-wrap gap-2">
              {byStatus('absent').map((r, i) => (
                <span key={r.attendance_id || i}
                  className="bg-white border border-red-200 text-red-700 text-xs font-medium px-3 py-1.5 rounded-lg">
                  {r.learner_name}
                  {r.school_name && <span className="text-red-400 ml-1">· {r.school_name}</span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Main history view ─────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="form-label">Programme</label>
            <select value={programId} onChange={e => setProgramId(e.target.value)} className="form-select">
              <option value="">All programmes</option>
              {programs.map(p => (
                <option key={p.program_id} value={p.program_id}>{p.program_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">From</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="form-input" />
          </div>
          <div>
            <label className="form-label">To</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="form-input" />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={load} disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Loading…' : 'Apply'}
            </button>
            <button onClick={exportCSV} title="Export CSV" className="btn-secondary px-3">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        {view === 'register' && (
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by learner name, code or school…"
              className="form-input pl-9" />
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Records', value: records.length, color: 'text-gray-800' },
          { label: 'Present',       value: records.filter(r=>r.status==='present').length, color: 'text-mint-600' },
          { label: 'Absent',        value: records.filter(r=>r.status==='absent').length,  color: 'text-red-600' },
          { label: 'Attendance Rate',
            value: records.length ? `${Math.round(records.filter(r=>r.status==='present').length/records.length*100)}%` : '—',
            color: rate >= 75 ? 'text-mint-600' : 'text-red-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['sessions','register'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={cn('px-3 py-1.5 rounded text-sm font-medium transition-all',
              view === v ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            {v === 'sessions' ? '📅 Sessions' : '📋 Full Register'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto" />
        </div>
      ) : view === 'sessions' ? (

        /* Sessions list — each row is clickable */
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">{sessions.length} sessions
              <span className="text-xs text-gray-400 font-normal ml-2">— click a row to see the full register</span>
            </p>
          </div>
          {sessions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No attendance records found for this period.</div>
          ) : (
            <table className="w-full data-table">
              <thead>
                <tr key="hdr">
                  <th key="date">Date</th>
                  <th key="prog">Programme</th>
                  <th key="total">Total</th>
                  <th key="pres">Present</th>
                  <th key="abs">Absent</th>
                  <th key="late">Late</th>
                  <th key="exc">Excused</th>
                  <th key="rate">Rate</th>
                  <th key="action"></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => (
                  <tr key={s.key || i}
                    onClick={() => setSelected(s)}
                    className="cursor-pointer hover:bg-brand-50 transition-colors">
                    <td key="date" className="font-medium">{fmt.date(s.session_date)}</td>
                    <td key="prog" className="text-gray-600">{s.program_name}</td>
                    <td key="total" className="font-mono">{s.total}</td>
                    <td key="pres" className="font-mono text-mint-600 font-semibold">{s.present}</td>
                    <td key="abs"  className="font-mono text-red-600 font-semibold">{s.absent}</td>
                    <td key="late" className="font-mono text-yellow-600">{s.late}</td>
                    <td key="exc"  className="font-mono text-blue-600">{s.excused}</td>
                    <td key="rate">
                      <span className={cn('font-mono font-semibold',
                        s.rate >= 75 ? 'text-mint-600' : s.rate >= 60 ? 'text-yellow-600' : 'text-red-600')}>
                        {s.rate}%
                      </span>
                    </td>
                    <td key="action" className="text-xs text-brand-700 font-medium">View →</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      ) : (

        /* Full register */
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Full Register — {filtered.length} records</h2>
            {totalPages > 1 && <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>}
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No records match your filters.</div>
          ) : (
            <table className="w-full data-table">
              <thead>
                <tr key="hdr">
                  <th key="date">Date</th>
                  <th key="name">Learner</th>
                  <th key="code">Code</th>
                  <th key="school">School</th>
                  <th key="prog">Programme</th>
                  <th key="status">Status</th>
                  <th key="notes">Notes</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r, i) => (
                  <tr key={r.attendance_id || i}>
                    <td key="date"   className="text-xs text-gray-500 font-mono">{fmt.date(r.session_date)}</td>
                    <td key="name"   className="font-medium">{r.learner_name}</td>
                    <td key="code"   className="font-mono text-xs text-gray-400">{r.learner_code}</td>
                    <td key="school" className="text-gray-500 text-xs">{r.school_name}</td>
                    <td key="prog"   className="text-gray-500 text-xs">{r.program_name}</td>
                    <td key="status">
                      <span className={cn('badge capitalize border', STATUS_COLORS[r.status] || 'bg-gray-50 text-gray-600')}>
                        {r.status}
                      </span>
                    </td>
                    <td key="notes"  className="text-xs text-gray-400">{r.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">
                {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                  className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
                  className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
