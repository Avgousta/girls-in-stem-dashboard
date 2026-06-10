'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { DS } from '@/components/platform/tokens';
import SponsorCell from './SponsorCell';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Learner {
  id: string; code: string; grade: number; status: string;
  first_name: string; last_name: string; email: string;
  school: string; risk: string; att: number; score: number;
  sponsors: Array<{ sponsor_id: string; sponsor_name: string }>;
  programmes: string[];
}
interface Props {
  learners:  Learner[];
  sponsors:  Array<{ sponsor_id: string; sponsor_name: string }>;
  grades:    number[];
  schools:   string[];
  isAdmin:   boolean;
}
type SortKey = 'name' | 'grade' | 'school' | 'att' | 'score' | 'risk';
type SortDir = 'asc' | 'desc';

const RISK_ORDER = { high: 0, medium: 1, low: 2 };

// ─── Inline badges (DS-aware) ─────────────────────────────────────────────────
const RISK_CFG = {
  high:   { color: 'var(--ds-danger)',  bg: 'var(--ds-danger-light)'  },
  medium: { color: 'var(--ds-warn)',    bg: 'var(--ds-warn-light)'    },
  low:    { color: 'var(--ds-success)', bg: 'var(--ds-success-light)' },
};
const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  active:    { color: 'var(--ds-success)', bg: 'var(--ds-success-light)' },
  inactive:  { color: 'var(--ds-text-muted)', bg: 'var(--ds-surface-hover)' },
  graduated: { color: '#818CF8', bg: 'rgba(129,140,248,0.15)' },
};

function RiskPill({ risk }: { risk: string }) {
  const c = RISK_CFG[risk as keyof typeof RISK_CFG] ?? RISK_CFG.low;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
      style={{ background: c.bg, color: c.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
      {risk}
    </span>
  );
}
function StatusPill({ status }: { status: string }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG.inactive;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
      style={{ background: c.bg, color: c.color }}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ─── Select style helper ───────────────────────────────────────────────────────
const selectSt: React.CSSProperties = {
  background: DS.surfaceHover as string, color: DS.text as string,
  border: `1px solid ${DS.border}`, borderRadius: '10px',
  padding: '7px 10px', fontSize: '13px', outline: 'none', width: '100%',
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LearnersClient({ learners, sponsors, grades, schools, isAdmin }: Props) {
  const [search,       setSearch]       = useState('');
  const [gradeFilter,  setGradeFilter]  = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [riskFilter,   setRiskFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey,      setSortKey]      = useState<SortKey>('name');
  const [sortDir,      setSortDir]      = useState<SortDir>('asc');
  const [page,         setPage]         = useState(1);
  const PAGE_SIZE = 25;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return learners
      .filter(l => {
        if (gradeFilter  && String(l.grade) !== gradeFilter) return false;
        if (schoolFilter && l.school        !== schoolFilter) return false;
        if (riskFilter   && l.risk          !== riskFilter)   return false;
        if (statusFilter && l.status        !== statusFilter) return false;
        if (q) {
          const hay = `${l.first_name} ${l.last_name} ${l.code} ${l.school} ${l.email} ${l.programmes.join(' ')}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case 'name':   cmp = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`); break;
          case 'grade':  cmp = a.grade  - b.grade;  break;
          case 'school': cmp = a.school.localeCompare(b.school); break;
          case 'att':    cmp = a.att    - b.att;    break;
          case 'score':  cmp = a.score  - b.score;  break;
          case 'risk':   cmp = (RISK_ORDER[a.risk as keyof typeof RISK_ORDER] ?? 1) - (RISK_ORDER[b.risk as keyof typeof RISK_ORDER] ?? 1); break;
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [learners, search, gradeFilter, schoolFilter, riskFilter, statusFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = search || gradeFilter || schoolFilter || riskFilter || statusFilter;
  const clearAll   = () => { setSearch(''); setGradeFilter(''); setSchoolFilter(''); setRiskFilter(''); setStatusFilter(''); setPage(1); };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronUp className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc'
      ? <ChevronUp   className="w-3 h-3" style={{ color: DS.primary }} />
      : <ChevronDown className="w-3 h-3" style={{ color: DS.primary }} />;
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 16px', textAlign: 'left', fontSize: '10px',
    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
    color: DS.textMuted as string, borderBottom: `1px solid ${DS.border}`,
    background: DS.surfaceHover as string, whiteSpace: 'nowrap',
  };

  return (
    <div className="space-y-4">

      {/* Filter bar */}
      <div className="rounded-2xl p-4 space-y-3"
        style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <div className="flex flex-wrap gap-3 items-end">

          {/* Search */}
          <div className="flex-1 min-w-[220px]">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: DS.textMuted }}>Search</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: DS.textMuted }} />
              <input value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Name, code, email, programme…"
                className="form-input pl-9 w-full" />
              {search && (
                <button aria-label="Clear search" onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: DS.textMuted }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Grade */}
          <div className="w-32">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: DS.textMuted }}>Grade</p>
            <select value={gradeFilter} onChange={e => { setGradeFilter(e.target.value); setPage(1); }} style={selectSt}>
              <option value="">All grades</option>
              {grades.map(g => <option key={g} value={String(g)}>Grade {g}</option>)}
            </select>
          </div>

          {/* School */}
          <div className="min-w-[180px] flex-1 max-w-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: DS.textMuted }}>School</p>
            <select value={schoolFilter} onChange={e => { setSchoolFilter(e.target.value); setPage(1); }} style={selectSt}>
              <option value="">All schools</option>
              {schools.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Risk */}
          <div className="w-36">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: DS.textMuted }}>Risk</p>
            <select value={riskFilter} onChange={e => { setRiskFilter(e.target.value); setPage(1); }} style={selectSt}>
              <option value="">All levels</option>
              <option value="high">High risk</option>
              <option value="medium">Monitoring</option>
              <option value="low">On track</option>
            </select>
          </div>

          {/* Status */}
          <div className="w-36">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: DS.textMuted }}>Status</p>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={selectSt}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="graduated">Graduated</option>
            </select>
          </div>

          {hasFilters && (
            <button onClick={clearAll}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer self-end"
              style={{ background: DS.surfaceHover, color: DS.textMuted as string }}>
              <X className="w-3.5 h-3.5" /> Clear all
            </button>
          )}
        </div>

        {/* Active filter pills */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2 pt-3" style={{ borderTop: `1px solid ${DS.borderLight}` }}>
            <span className="text-xs self-center" style={{ color: DS.textMuted }}>Filters:</span>
            {[
              { val: search,       label: `"${search}"`,        clear: () => setSearch('')       },
              { val: gradeFilter,  label: `Grade ${gradeFilter}`, clear: () => setGradeFilter('') },
              { val: schoolFilter, label: schoolFilter,           clear: () => setSchoolFilter('') },
              { val: riskFilter,   label: `${riskFilter} risk`,   clear: () => setRiskFilter('')   },
              { val: statusFilter, label: statusFilter,           clear: () => setStatusFilter('') },
            ].filter(f => f.val).map(f => (
              <span key={f.label} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: DS.primaryLight, color: DS.primary, border: `1px solid ${DS.primaryBorder}` }}>
                {f.label}
                <button aria-label={`Remove ${f.label} filter`} onClick={f.clear} className="cursor-pointer"><X className="w-3 h-3" /></button>
              </span>
            ))}
            <span className="text-xs self-center ml-auto" style={{ color: DS.textMuted }}>
              {filtered.length} of {learners.length} learners
            </span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-medium" style={{ color: DS.textMuted }}>No learners match your filters</p>
            <button onClick={clearAll} className="text-sm mt-1 hover:underline" style={{ color: DS.primary }}>
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {[
                      { label: 'ID',     key: null      as SortKey | null },
                      { label: 'Name',   key: 'name'   as SortKey },
                      { label: 'School', key: 'school' as SortKey },
                      { label: 'Grade',  key: 'grade'  as SortKey },
                      { label: 'Sponsor',key: null      as SortKey | null },
                      { label: 'Status', key: null      as SortKey | null },
                      { label: 'Risk',   key: 'risk'   as SortKey },
                      { label: 'Att %',  key: 'att'    as SortKey },
                      { label: 'Score',  key: 'score'  as SortKey },
                      { label: '',       key: null      as SortKey | null },
                    ].map(({ label, key }) => (
                      <th key={label} style={thStyle}
                        onClick={key ? () => handleSort(key) : undefined}
                        className={key ? 'cursor-pointer select-none' : ''}>
                        {key ? (
                          <span className="flex items-center gap-1">{label} <SortIcon k={key} /></span>
                        ) : label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map(l => (
                    <tr key={l.id}
                      style={{ borderBottom: `1px solid ${DS.borderLight}` }}
                      onMouseOver={e => { (e.currentTarget as HTMLTableRowElement).style.background = DS.surfaceHover as string; }}
                      onMouseOut={e =>  { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}>

                      {/* Code */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs" style={{ color: DS.textMuted }}>{l.code}</span>
                      </td>

                      {/* Name + programme */}
                      <td className="px-4 py-3">
                        <Link href={`/learners/${l.id}`}
                          className="font-semibold hover:underline" style={{ color: DS.text }}>
                          {l.first_name} {l.last_name}
                        </Link>
                        {l.programmes[0] && (
                          <p className="text-xs mt-0.5 truncate max-w-[180px]" style={{ color: DS.textMuted }}>
                            {l.programmes[0]}
                          </p>
                        )}
                      </td>

                      {/* School */}
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: DS.textMid }}>{l.school}</span>
                      </td>

                      {/* Grade */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm" style={{ color: DS.textMid }}>Gr {l.grade}</span>
                      </td>

                      {/* Sponsor */}
                      <td className="px-4 py-3">
                        <SponsorCell learnerId={l.id} currentSponsors={l.sponsors} allSponsors={sponsors} canEdit={isAdmin} />
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3"><StatusPill status={l.status} /></td>

                      {/* Risk */}
                      <td className="px-4 py-3"><RiskPill risk={l.risk} /></td>

                      {/* Att */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold tabular-nums"
                          style={{ color: l.att < 75 ? 'var(--ds-danger)' : 'var(--ds-success)' }}>
                          {l.att}%
                        </span>
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold tabular-nums"
                          style={{ color: l.score < 50 ? 'var(--ds-danger)' : 'var(--ds-success)' }}>
                          {l.score}%
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex gap-3">
                          <Link href={`/learners/${l.id}`}
                            className="text-xs font-semibold whitespace-nowrap hover:underline"
                            style={{ color: DS.primary }}>
                            View
                          </Link>
                          {isAdmin && (
                            <Link href={`/learners/${l.id}/edit`}
                              className="text-xs font-semibold hover:underline"
                              style={{ color: DS.textMuted as string }}>
                              Edit
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderTop: `1px solid ${DS.border}`, background: DS.surfaceHover as string }}>
                <p className="text-xs" style={{ color: DS.textMuted }}>
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-40 transition-all"
                    style={{ background: DS.surface, border: `1px solid ${DS.border}`, color: DS.textMid as string }}>
                    ← Prev
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const p = totalPages <= 7 ? i + 1
                      : page <= 4 ? i + 1
                      : page >= totalPages - 3 ? totalPages - 6 + i
                      : page - 3 + i;
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        className="w-8 h-8 text-xs font-semibold rounded-lg cursor-pointer transition-all"
                        style={page === p
                          ? { background: DS.primary, color: '#fff' }
                          : { background: DS.surface, border: `1px solid ${DS.border}`, color: DS.textMid as string }}>
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-40 transition-all"
                    style={{ background: DS.surface, border: `1px solid ${DS.border}`, color: DS.textMid as string }}>
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
