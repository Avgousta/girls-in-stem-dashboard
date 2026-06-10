'use client';
import { useState, useEffect, useCallback } from 'react';
import { fmt } from '@/utils';
import { DS } from '@/components/platform/tokens';
import { Search, Download, Loader2, ChevronLeft, ChevronRight, ArrowLeft, Pencil, X, Check } from 'lucide-react';

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
  total: number; present: number; absent: number; late: number; excused: number; rate: number;
}

interface Props {
  programs:        Program[];
  initialProgram?: string;
  initialFrom?:    string;
  initialTo?:      string;
}

// DS-aware status pill
const STATUS_CFG: Record<string, { color: string; bg: string; symbol: string }> = {
  present: { color: 'var(--ds-success)', bg: 'var(--ds-success-light)', symbol: '✓' },
  absent:  { color: 'var(--ds-danger)',  bg: 'var(--ds-danger-light)',  symbol: '✗' },
  late:    { color: 'var(--ds-warn)',    bg: 'var(--ds-warn-light)',    symbol: '~' },
  excused: { color: '#818CF8',           bg: 'rgba(129,140,248,0.15)', symbol: 'E' },
};

function StatusPill({ status }: { status: string }) {
  const c = STATUS_CFG[status] ?? { color: DS.textMuted, bg: DS.surfaceHover, symbol: '?' };
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
      style={{ background: c.bg, color: c.color }}>
      {c.symbol} {status}
    </span>
  );
}

const selectSt: React.CSSProperties = {
  background: DS.surfaceHover as string, color: DS.text as string,
  border: `1px solid ${DS.border}`, borderRadius: '10px',
  padding: '7px 10px', fontSize: '13px', outline: 'none', width: '100%',
};

const inputSt: React.CSSProperties = {
  background: DS.surfaceHover as string, color: DS.text as string,
  border: `1px solid ${DS.border}`, borderRadius: '10px',
  padding: '7px 10px', fontSize: '13px', outline: 'none', width: '100%',
};

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-2xl p-4 text-center" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
      <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>{label}</p>
    </div>
  );
}

const thSt: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.08em', color: DS.textMuted as string,
  borderBottom: `1px solid ${DS.border}`, background: DS.surfaceHover as string,
  whiteSpace: 'nowrap',
};

export default function AttendanceHistory({ programs, initialProgram, initialFrom, initialTo }: Props) {
  const today  = new Date().toISOString().slice(0, 10);
  const month1 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [view,      setView]      = useState<'sessions' | 'register'>('sessions');
  const [programId, setProgramId] = useState(initialProgram || '');
  const [fromDate,  setFromDate]  = useState(initialFrom    || month1);
  const [toDate,    setToDate]    = useState(initialTo      || today);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(false);
  const [records,   setRecords]   = useState<AttendanceRecord[]>([]);
  const [sessions,  setSessions]  = useState<SessionSummary[]>([]);
  const [page,      setPage]      = useState(1);
  const [selected,  setSelected]  = useState<SessionSummary | null>(null);
  const [editing,   setEditing]   = useState<string | null>(null); // attendance_id being edited
  const [editStatus, setEditStatus] = useState<string>('');
  const [editNotes,  setEditNotes]  = useState<string>('');
  const [saving,    setSaving]    = useState(false);

  const PAGE_SIZE = 50;

  const startEdit = (r: AttendanceRecord) => {
    setEditing(r.attendance_id);
    setEditStatus(r.status);
    setEditNotes(r.notes || '');
  };

  const cancelEdit = () => { setEditing(null); };

  const saveEdit = async (r: AttendanceRecord) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/attendance/${r.attendance_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: editStatus, notes: editNotes || null }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
      // Update local records state so UI reflects change immediately
      setRecords(prev => prev.map(rec =>
        rec.attendance_id === r.attendance_id
          ? { ...rec, status: editStatus, notes: editNotes || null }
          : rec
      ));
      // Recompute session summary totals
      setSessions(prev => prev.map(s => {
        if (s.session_date !== r.session_date || s.program_name !== r.program_name) return s;
        const updated = { ...s };
        type StatusKey = 'present' | 'absent' | 'late' | 'excused';
        const dec = r.status as StatusKey; if (dec in updated) updated[dec]--;
        const inc = editStatus as StatusKey; if (inc in updated) updated[inc]++;
        updated.rate = updated.total ? Math.round(updated.present / updated.total * 100) : 0;
        return updated;
      }));
      setEditing(null);
    } catch (e) {
      alert(`Save failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setSaving(false); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(null);
    try {
      const p = new URLSearchParams({ from: fromDate, to: toDate, limit: '500' });
      if (programId) p.set('program_id', programId);
      const res  = await fetch(`/api/v1/attendance/history?${p}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const data: AttendanceRecord[] = json.data || [];
      setRecords(data);

      const sessMap: Record<string, SessionSummary> = {};
      data.forEach(r => {
        const key = `${r.session_date}__${r.program_name}`;
        if (!sessMap[key]) sessMap[key] = { key, session_date: r.session_date, program_name: r.program_name, total: 0, present: 0, absent: 0, late: 0, excused: 0, rate: 0 };
        sessMap[key].total++;
        const st = r.status as 'present' | 'absent' | 'late' | 'excused'; if (st in sessMap[key]) sessMap[key][st]++;
      });
      const sess = Object.values(sessMap)
        .map(s => ({ ...s, rate: s.total ? Math.round(s.present / s.total * 100) : 0 }))
        .sort((a, b) => b.session_date.localeCompare(a.session_date));
      setSessions(sess);
      setPage(1);
    } finally { setLoading(false); }
  }, [programId, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const sessionRecords = selected
    ? records.filter(r => r.session_date === selected.session_date && r.program_name === selected.program_name)
    : [];

  const filtered   = records.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.learner_name.toLowerCase().includes(q) || r.learner_code?.toLowerCase().includes(q) || r.school_name?.toLowerCase().includes(q);
  });
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const rate       = records.length ? Math.round(records.filter(r => r.status === 'present').length / records.length * 100) : 0;

  const exportCSV = () => {
    const rows    = selected ? sessionRecords : filtered;
    const headers = ['Date', 'Learner', 'Code', 'School', 'Programme', 'Status', 'Notes'];
    const csv = [headers, ...rows.map(r => [
      r.session_date, r.learner_name, r.learner_code,
      r.school_name, r.program_name, r.status, r.notes || '',
    ])].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = selected
      ? `attendance_${selected.session_date}_${selected.program_name.replace(/\s+/g, '_')}.csv`
      : `attendance_${fromDate}_to_${toDate}.csv`;
    a.click();
  };

  // ── Session detail ────────────────────────────────────────────────────────
  if (selected) {
    const byStatus = (s: string) => sessionRecords.filter(r => r.status === s);
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <button onClick={() => setSelected(null)}
              className="inline-flex items-center gap-1.5 text-sm font-medium mb-2 hover:underline cursor-pointer"
              style={{ color: DS.textMuted }}>
              <ArrowLeft className="w-4 h-4" /> Back to Sessions
            </button>
            <h2 className="text-xl font-bold" style={{ color: DS.text }}>{fmt.date(selected.session_date)}</h2>
            <p className="text-sm" style={{ color: DS.textMuted }}>{selected.program_name}</p>
          </div>
          <button onClick={exportCSV} className="btn-secondary text-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* Session stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatCard label="Total"   value={selected.total}   color={DS.text as string}     />
          <StatCard label="Present" value={selected.present} color="var(--ds-success)"      />
          <StatCard label="Absent"  value={selected.absent}  color="var(--ds-danger)"       />
          <StatCard label="Late"    value={selected.late}    color="var(--ds-warn)"          />
          <StatCard label="Rate"    value={`${selected.rate}%`} color={selected.rate >= 75 ? 'var(--ds-success)' : 'var(--ds-danger)'} />
        </div>

        {/* Register table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: `1px solid ${DS.border}` }}>
            <h3 className="text-sm font-semibold" style={{ color: DS.text }}>
              Attendance Register — {sessionRecords.length} learners
            </h3>
          </div>
          {sessionRecords.length === 0 ? (
            <div className="text-center py-12 text-sm" style={{ color: DS.textMuted }}>No records for this session.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['#', 'Learner', 'Code', 'School', 'Status', 'Notes', ''].map(h => (
                    <th key={h} style={thSt}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(['present', 'late', 'excused', 'absent'] as const).map(status => {
                  const group = byStatus(status);
                  if (!group.length) return null;
                  return group.map((r, i) => {
                    const isEditing = editing === r.attendance_id;
                    return (
                      <tr key={r.attendance_id || `${status}-${i}`}
                        style={{
                          borderBottom: `1px solid ${DS.borderLight}`,
                          background: isEditing
                            ? `rgba(${DS.primary},0.08)`
                            : r.status === 'absent' ? 'var(--ds-danger-light)' : 'transparent',
                        }}>
                        <td className="px-4 py-3 text-xs font-mono" style={{ color: DS.textMuted }}>
                          {sessionRecords.indexOf(r) + 1}
                        </td>
                        <td className="px-4 py-3 font-medium" style={{ color: DS.text }}>{r.learner_name}</td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: DS.textMuted }}>{r.learner_code}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: DS.textMid }}>{r.school_name}</td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                              style={{ ...selectSt, width: 'auto', padding: '4px 8px', fontSize: '12px', colorScheme: 'dark' }}>
                              {['present','absent','late','excused'].map(s => (
                                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                              ))}
                            </select>
                          ) : (
                            <StatusPill status={r.status} />
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: DS.textMuted }}>
                          {isEditing ? (
                            <input value={editNotes} onChange={e => setEditNotes(e.target.value)}
                              placeholder="Add note…"
                              style={{ ...inputSt, padding: '4px 8px', fontSize: '12px', width: '160px' }} />
                          ) : (
                            r.notes || '—'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex gap-1.5 items-center">
                              <button onClick={() => saveEdit(r)} disabled={saving}
                                title="Save" aria-label="Save"
                                className="p-1.5 rounded-lg cursor-pointer transition-colors"
                                style={{ background: 'var(--ds-success)', color: '#fff' }}>
                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              </button>
                              <button onClick={cancelEdit} title="Cancel" aria-label="Cancel"
                                className="p-1.5 rounded-lg cursor-pointer transition-colors"
                                style={{ background: DS.surfaceHover, color: DS.textMuted as string }}>
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => startEdit(r)} title="Edit attendance" aria-label="Edit attendance"
                              className="p-1.5 rounded-lg cursor-pointer opacity-40 hover:opacity-100 transition-opacity"
                              style={{ background: DS.surfaceHover }}>
                              <Pencil className="w-3.5 h-3.5" style={{ color: DS.textMid as string }} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Absent callout */}
        {selected.absent > 0 && (
          <div className="rounded-2xl p-5"
            style={{ background: 'var(--ds-danger-light)', border: '1px solid var(--ds-danger)' }}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"
              style={{ color: 'var(--ds-danger)' }}>
              ✗ Absent ({selected.absent})
            </h3>
            <div className="flex flex-wrap gap-2">
              {byStatus('absent').map((r, i) => (
                <span key={r.attendance_id || i}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg"
                  style={{ background: DS.surface, border: `1px solid var(--ds-danger)`, color: 'var(--ds-danger)' }}>
                  {r.learner_name}
                  {r.school_name && <span style={{ color: DS.textMuted }}> · {r.school_name}</span>}
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
      <div className="rounded-2xl p-5" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: DS.textMuted }}>Programme</p>
            <select value={programId} onChange={e => setProgramId(e.target.value)} style={selectSt}>
              <option value="">All programmes</option>
              {programs.map(p => <option key={p.program_id} value={p.program_id}>{p.program_name}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: DS.textMuted }}>From</p>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={inputSt} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: DS.textMuted }}>To</p>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={inputSt} />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={load} disabled={loading} className="btn-primary flex-1">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Loading…' : 'Apply'}
            </button>
            <button onClick={exportCSV} title="Export CSV" aria-label="Export CSV" className="btn-secondary px-3">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {view === 'register' && (
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: DS.textMuted }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by learner name, code or school…"
              style={{ ...inputSt, paddingLeft: '36px' }} />
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Records" value={records.length}                                                           color={DS.text as string} />
        <StatCard label="Present"       value={records.filter(r => r.status === 'present').length}                      color="var(--ds-success)" />
        <StatCard label="Absent"        value={records.filter(r => r.status === 'absent').length}                       color="var(--ds-danger)"  />
        <StatCard label="Attendance Rate" value={records.length ? `${rate}%` : '—'}                                     color={rate >= 75 ? 'var(--ds-success)' : 'var(--ds-danger)'} />
      </div>

      {/* View toggle */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: DS.surfaceHover }}>
        {(['sessions', 'register'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer"
            style={view === v
              ? { background: DS.primary, color: '#fff' }
              : { background: 'transparent', color: DS.textMid as string }}>
            {v === 'sessions' ? '📅 Sessions' : '📋 Full Register'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl p-16 text-center"
          style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: DS.primary }} />
        </div>
      ) : view === 'sessions' ? (

        /* Sessions list */
        <div className="rounded-2xl overflow-hidden"
          style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${DS.border}` }}>
            <p className="text-sm font-semibold" style={{ color: DS.text }}>
              {sessions.length} sessions
              <span className="text-xs font-normal ml-2" style={{ color: DS.textMuted }}>
                — click a row to see the full register
              </span>
            </p>
          </div>
          {sessions.length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: DS.textMuted }}>
              No attendance records found for this period.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Date', 'Programme', 'Total', 'Present', 'Absent', 'Late', 'Excused', 'Rate', ''].map(h => (
                    <th key={h} style={thSt}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => (
                  <tr key={s.key || i} role="button" tabIndex={0} aria-label={`View session ${fmt.date(s.session_date)}`} onClick={() => setSelected(s)} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setSelected(s)}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: `1px solid ${DS.borderLight}` }}
                    onMouseOver={e => { (e.currentTarget as HTMLTableRowElement).style.background = DS.surfaceHover as string; }}
                    onMouseOut={e =>  { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}>
                    <td className="px-4 py-3 font-medium" style={{ color: DS.text }}>{fmt.date(s.session_date)}</td>
                    <td className="px-4 py-3" style={{ color: DS.textMid }}>{s.program_name}</td>
                    <td className="px-4 py-3 font-mono" style={{ color: DS.textMid }}>{s.total}</td>
                    <td className="px-4 py-3 font-mono font-semibold" style={{ color: 'var(--ds-success)' }}>{s.present}</td>
                    <td className="px-4 py-3 font-mono font-semibold" style={{ color: 'var(--ds-danger)' }}>{s.absent}</td>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--ds-warn)' }}>{s.late}</td>
                    <td className="px-4 py-3 font-mono" style={{ color: '#818CF8' }}>{s.excused}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold"
                        style={{ color: s.rate >= 75 ? 'var(--ds-success)' : s.rate >= 60 ? 'var(--ds-warn)' : 'var(--ds-danger)' }}>
                        {s.rate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold" style={{ color: DS.primary }}>View →</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      ) : (

        /* Full register */
        <div className="rounded-2xl overflow-hidden"
          style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: `1px solid ${DS.border}` }}>
            <h2 className="text-sm font-semibold" style={{ color: DS.text }}>
              Full Register — {filtered.length} records
            </h2>
            {totalPages > 1 && (
              <span className="text-xs" style={{ color: DS.textMuted }}>Page {page} of {totalPages}</span>
            )}
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: DS.textMuted }}>
              No records match your filters.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Date', 'Learner', 'Code', 'School', 'Programme', 'Status', 'Notes'].map(h => (
                    <th key={h} style={thSt}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((r, i) => (
                  <tr key={r.attendance_id || i}
                    style={{ borderBottom: `1px solid ${DS.borderLight}` }}>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: DS.textMuted }}>{fmt.date(r.session_date)}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: DS.text }}>{r.learner_name}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: DS.textMuted }}>{r.learner_code}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: DS.textMid }}>{r.school_name}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: DS.textMid }}>{r.program_name}</td>
                    <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                    <td className="px-4 py-3 text-xs" style={{ color: DS.textMuted }}>{r.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3"
              style={{ borderTop: `1px solid ${DS.border}`, background: DS.surfaceHover as string }}>
              <p className="text-xs" style={{ color: DS.textMuted }}>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex gap-1">
                <button aria-label="Previous page" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg cursor-pointer disabled:opacity-40 transition-colors"
                  style={{ background: DS.surfaceHover }}>
                  <ChevronLeft className="w-4 h-4" style={{ color: DS.textMid }} />
                </button>
                <button aria-label="Next page" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded-lg cursor-pointer disabled:opacity-40 transition-colors"
                  style={{ background: DS.surfaceHover }}>
                  <ChevronRight className="w-4 h-4" style={{ color: DS.textMid }} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
