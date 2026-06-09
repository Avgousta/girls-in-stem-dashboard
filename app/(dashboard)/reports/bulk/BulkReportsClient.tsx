'use client';
import { useState, useMemo } from 'react';
import { DS } from '@/components/platform/tokens';
import { FileText, Search, CheckSquare, Square, ExternalLink, Filter } from 'lucide-react';

interface Learner {
  learner_id:   string;
  learner_code: string;
  grade:        number;
  full_name:    string;
  school_name:  string;
  risk_level:   string;
  avg_score:    number;
  att_rate:     number;
}

const riskCol = (r: string) =>
  r === 'high' ? 'var(--ds-danger)' : r === 'medium' ? 'var(--ds-warn)' : 'var(--ds-success)';

const GRADES = [9, 10, 11, 12];
const RISKS  = ['high', 'medium', 'low'] as const;

export default function BulkReportsClient({ learners }: { learners: Learner[] }) {
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [search,       setSearch]       = useState('');
  const [gradeFilter,  setGradeFilter]  = useState<number | 'all'>('all');
  const [riskFilter,   setRiskFilter]   = useState<string | 'all'>('all');
  const [opening,      setOpening]      = useState(false);

  const filtered = useMemo(() => learners.filter(l => {
    if (search && !l.full_name.toLowerCase().includes(search.toLowerCase()) &&
        !l.learner_code.toLowerCase().includes(search.toLowerCase())) return false;
    if (gradeFilter !== 'all' && l.grade !== gradeFilter) return false;
    if (riskFilter  !== 'all' && l.risk_level !== riskFilter) return false;
    return true;
  }), [learners, search, gradeFilter, riskFilter]);

  const allSelected   = filtered.length > 0 && filtered.every(l => selected.has(l.learner_id));
  const someSelected  = filtered.some(l => selected.has(l.learner_id));

  const toggleOne  = (id: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleAll  = () => {
    if (allSelected) {
      setSelected(prev => { const s = new Set(prev); filtered.forEach(l => s.delete(l.learner_id)); return s; });
    } else {
      setSelected(prev => { const s = new Set(prev); filtered.forEach(l => s.add(l.learner_id)); return s; });
    }
  };

  const openReports = () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setOpening(true);
    // Open each report in a new tab with a small delay to avoid popup blockers
    ids.forEach((id, i) => {
      setTimeout(() => window.open(`/api/v1/reports/learner/${id}`, '_blank'), i * 300);
    });
    setTimeout(() => setOpening(false), ids.length * 300 + 500);
  };

  const thSt: React.CSSProperties = {
    padding: '10px 14px', textAlign: 'left', fontSize: '10px', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em', color: DS.textMuted as string,
    borderBottom: `1px solid ${DS.border}`, background: DS.surfaceHover as string,
  };

  return (
    <div className="space-y-4">

      {/* Filters */}
      <div className="rounded-2xl p-4 space-y-3"
        style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: DS.textMuted }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or code…"
              aria-label="Search learners"
              className="w-full rounded-xl py-2 text-sm focus:outline-none"
              style={{
                paddingLeft: 36, paddingRight: 12,
                background: DS.surfaceHover as string,
                color: DS.text as string,
                border: `1px solid ${DS.border}`,
              }} />
          </div>

          {/* Grade filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 shrink-0" style={{ color: DS.textMuted }} />
            <div className="flex gap-1">
              <button onClick={() => setGradeFilter('all')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={gradeFilter === 'all'
                  ? { background: DS.primary, color: '#fff' }
                  : { background: DS.surfaceHover as string, color: DS.textMid as string }}>
                All Grades
              </button>
              {GRADES.map(g => (
                <button key={g} onClick={() => setGradeFilter(g === gradeFilter ? 'all' : g)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                  aria-pressed={gradeFilter === g}
                  style={gradeFilter === g
                    ? { background: DS.primary, color: '#fff' }
                    : { background: DS.surfaceHover as string, color: DS.textMid as string }}>
                  Gr {g}
                </button>
              ))}
            </div>
          </div>

          {/* Risk filter */}
          <div className="flex gap-1">
            <button onClick={() => setRiskFilter('all')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              style={riskFilter === 'all'
                ? { background: DS.primary, color: '#fff' }
                : { background: DS.surfaceHover as string, color: DS.textMid as string }}>
              All Risk
            </button>
            {RISKS.map(r => (
              <button key={r} onClick={() => setRiskFilter(r === riskFilter ? 'all' : r)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer capitalize"
                aria-pressed={riskFilter === r}
                style={riskFilter === r
                  ? { background: riskCol(r), color: '#fff', border: `1px solid ${riskCol(r)}` }
                  : { background: `${riskCol(r)}15`, color: riskCol(r), border: `1px solid ${riskCol(r)}40` }}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={toggleAll} aria-label={allSelected ? 'Deselect all' : 'Select all visible'}
            className="flex items-center gap-1.5 text-sm font-medium cursor-pointer"
            style={{ color: DS.textMuted }}>
            {allSelected
              ? <CheckSquare className="w-4 h-4" style={{ color: DS.primary }} />
              : <Square className="w-4 h-4" />}
            {allSelected ? 'Deselect all' : `Select all (${filtered.length})`}
          </button>
          {selected.size > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: DS.primaryLight, color: DS.primary }}>
              {selected.size} selected
            </span>
          )}
        </div>
        <button
          onClick={openReports}
          disabled={selected.size === 0 || opening}
          aria-label={`Open ${selected.size} report${selected.size !== 1 ? 's' : ''} in new tabs`}
          className="btn-primary flex items-center gap-2 disabled:opacity-40 cursor-pointer">
          <ExternalLink className="w-4 h-4" />
          {opening
            ? `Opening ${selected.size} report${selected.size !== 1 ? 's' : ''}…`
            : `Open ${selected.size || ''} Report${selected.size !== 1 ? 's' : ''}`}
        </button>
      </div>

      {/* Learner table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <table className="w-full text-sm" role="grid" aria-label="Learner report selection">
          <thead>
            <tr>
              <th style={{ ...thSt, width: 40 }}>
                <button onClick={toggleAll} aria-label={allSelected ? 'Deselect all' : 'Select all'}
                  className="cursor-pointer">
                  {allSelected
                    ? <CheckSquare className="w-4 h-4" style={{ color: DS.primary }} />
                    : <Square className="w-4 h-4" style={{ color: DS.textMuted }} />}
                </button>
              </th>
              {['Code','Name','Grade','School','Risk','Avg Score','Attendance'].map(h => (
                <th key={h} style={thSt}>{h}</th>
              ))}
              <th style={thSt}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => {
              const isSelected = selected.has(l.learner_id);
              return (
                <tr key={l.learner_id}
                  onClick={() => toggleOne(l.learner_id)}
                  className="cursor-pointer transition-colors"
                  aria-selected={isSelected}
                  style={{
                    borderBottom: `1px solid ${DS.borderLight}`,
                    background: isSelected ? DS.primaryLight as string : 'transparent',
                  }}
                  onMouseOver={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = DS.surfaceHover as string; }}
                  onMouseOut={e =>  { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                  <td className="px-4 py-3">
                    {isSelected
                      ? <CheckSquare className="w-4 h-4" style={{ color: DS.primary }} />
                      : <Square className="w-4 h-4" style={{ color: DS.textMuted }} />}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: DS.textMuted }}>
                    {l.learner_code}
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color: DS.text }}>
                    {l.full_name}
                  </td>
                  <td className="px-4 py-3 font-mono" style={{ color: DS.textMid }}>
                    {l.grade}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: DS.textMid }}>
                    {l.school_name}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                      style={{ color: riskCol(l.risk_level), background: `${riskCol(l.risk_level)}20` }}>
                      {l.risk_level}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm font-semibold"
                    style={{ color: riskCol(l.avg_score >= 70 ? 'low' : l.avg_score >= 50 ? 'medium' : 'high') }}>
                    {Math.round(l.avg_score)}%
                  </td>
                  <td className="px-4 py-3 font-mono text-sm font-semibold"
                    style={{ color: l.att_rate >= 75 ? 'var(--ds-success)' : 'var(--ds-danger)' }}>
                    {Math.floor(l.att_rate)}%
                  </td>
                  <td className="px-4 py-3">
                    <a href={`/api/v1/reports/learner/${l.learner_id}`} target="_blank"
                      onClick={e => e.stopPropagation()}
                      aria-label={`Open report for ${l.full_name}`}
                      className="p-1.5 rounded-lg inline-flex opacity-50 hover:opacity-100 transition-opacity"
                      style={{ background: DS.surfaceHover, color: DS.primary as string }}>
                      <FileText className="w-3.5 h-3.5" />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm" style={{ color: DS.textMuted }}>
            No learners match your filters
          </div>
        )}
      </div>

      <p className="text-xs text-center" style={{ color: DS.textMuted }}>
        Reports open in new browser tabs. Allow pop-ups for this site if your browser blocks them.
        Each tab shows a printable HTML report — use Ctrl+P / Cmd+P to save as PDF.
      </p>
    </div>
  );
}
