'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { StatusBadge, RiskBadge } from '@/components/ui/Badge';
import SponsorCell from './SponsorCell';

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

type SortKey  = 'name' | 'grade' | 'school' | 'att' | 'score' | 'risk';
type SortDir  = 'asc' | 'desc';

const RISK_ORDER = { high: 0, medium: 1, low: 2 };

export default function LearnersClient({ learners, sponsors, grades, schools, isAdmin }: Props) {
  const [search,     setSearch]     = useState('');
  const [gradeFilter,setGradeFilter]= useState<string>('');
  const [schoolFilter,setSchoolFilter]= useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('');
  const [statusFilter,setStatusFilter]= useState<string>('');
  const [sortKey,    setSortKey]    = useState<SortKey>('name');
  const [sortDir,    setSortDir]    = useState<SortDir>('asc');
  const [page,       setPage]       = useState(1);
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
        if (gradeFilter  && String(l.grade)  !== gradeFilter)  return false;
        if (schoolFilter && l.school          !== schoolFilter)  return false;
        if (riskFilter   && l.risk            !== riskFilter)    return false;
        if (statusFilter && l.status          !== statusFilter)  return false;
        if (q) {
          const haystack = `${l.first_name} ${l.last_name} ${l.code} ${l.school} ${l.email} ${l.programmes.join(' ')}`.toLowerCase();
          if (!haystack.includes(q)) return false;
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
  const clearAll   = () => {
    setSearch(''); setGradeFilter(''); setSchoolFilter('');
    setRiskFilter(''); setStatusFilter(''); setPage(1);
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronUp className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc'
      ? <ChevronUp   className="w-3 h-3 text-brand-600" />
      : <ChevronDown className="w-3 h-3 text-brand-600" />;
  };

  return (
    <div className="space-y-4">

      {/* ── Search + Filters ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">

          {/* Search */}
          <div className="flex-1 min-w-[220px]">
            <label className="form-label">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Name, code, email, programme…"
                className="form-input pl-9 w-full"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Grade filter */}
          <div className="w-32">
            <label className="form-label">Grade</label>
            <select
              value={gradeFilter}
              onChange={e => { setGradeFilter(e.target.value); setPage(1); }}
              className="form-select w-full">
              <option value="">All grades</option>
              {grades.map(g => (
                <option key={g} value={String(g)}>Grade {g}</option>
              ))}
            </select>
          </div>

          {/* School filter */}
          <div className="min-w-[180px] flex-1 max-w-xs">
            <label className="form-label">School</label>
            <select
              value={schoolFilter}
              onChange={e => { setSchoolFilter(e.target.value); setPage(1); }}
              className="form-select w-full">
              <option value="">All schools</option>
              {schools.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Risk filter */}
          <div className="w-36">
            <label className="form-label">Risk</label>
            <select
              value={riskFilter}
              onChange={e => { setRiskFilter(e.target.value); setPage(1); }}
              className="form-select w-full">
              <option value="">All risk levels</option>
              <option value="high">High risk</option>
              <option value="medium">Monitoring</option>
              <option value="low">On track</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="w-36">
            <label className="form-label">Status</label>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="form-select w-full">
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="graduated">Graduated</option>
            </select>
          </div>

          {/* Clear */}
          {hasFilters && (
            <button onClick={clearAll}
              className="btn-secondary text-sm h-9 self-end flex items-center gap-1.5 whitespace-nowrap">
              <X className="w-3.5 h-3.5" /> Clear all
            </button>
          )}
        </div>

        {/* Active filter pills */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-400 self-center">Filters:</span>
            {search && (
              <span className="inline-flex items-center gap-1 text-xs bg-brand-50 text-brand-700 border border-brand-200 px-2.5 py-1 rounded-full font-medium">
                "{search}"
                <button onClick={() => setSearch('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {gradeFilter && (
              <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-medium">
                Grade {gradeFilter}
                <button onClick={() => setGradeFilter('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {schoolFilter && (
              <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full font-medium">
                {schoolFilter}
                <button onClick={() => setSchoolFilter('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {riskFilter && (
              <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full font-medium capitalize">
                {riskFilter} risk
                <button onClick={() => setRiskFilter('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {statusFilter && (
              <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-medium capitalize">
                {statusFilter}
                <button onClick={() => setStatusFilter('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            <span className="text-xs text-gray-400 self-center ml-auto">
              {filtered.length} of {learners.length} learners
            </span>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 font-medium">No learners match your filters</p>
            <button onClick={clearAll} className="text-sm text-brand-600 hover:underline mt-1">
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">ID</th>

                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-600 select-none"
                      onClick={() => handleSort('name')}>
                      <span className="flex items-center gap-1">Name <SortIcon k="name" /></span>
                    </th>

                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-600 select-none"
                      onClick={() => handleSort('school')}>
                      <span className="flex items-center gap-1">School <SortIcon k="school" /></span>
                    </th>

                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-600 select-none"
                      onClick={() => handleSort('grade')}>
                      <span className="flex items-center gap-1">Grade <SortIcon k="grade" /></span>
                    </th>

                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Sponsor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>

                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-600 select-none"
                      onClick={() => handleSort('risk')}>
                      <span className="flex items-center gap-1">Risk <SortIcon k="risk" /></span>
                    </th>

                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-600 select-none"
                      onClick={() => handleSort('att')}>
                      <span className="flex items-center gap-1">Att % <SortIcon k="att" /></span>
                    </th>

                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-600 select-none"
                      onClick={() => handleSort('score')}>
                      <span className="flex items-center gap-1">Score <SortIcon k="score" /></span>
                    </th>

                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {paged.map((l, i) => (
                    <tr key={l.id} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-400">{l.code}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/learners/${l.id}`}
                          className="font-semibold text-gray-900 hover:text-brand-700 hover:underline">
                          {l.first_name} {l.last_name}
                        </Link>
                        {l.programmes[0] && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">
                            {l.programmes[0]}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{l.school}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm">Gr {l.grade}</span>
                      </td>
                      <td className="px-4 py-3">
                        <SponsorCell
                          learnerId={l.id}
                          currentSponsors={l.sponsors}
                          allSponsors={sponsors}
                          canEdit={isAdmin}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge label={l.status} />
                      </td>
                      <td className="px-4 py-3">
                        <RiskBadge level={l.risk as any} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold tabular-nums ${l.att < 75 ? 'text-red-600' : 'text-gray-700'}`}>
                          {l.att}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold tabular-nums ${l.score < 50 ? 'text-red-600' : 'text-gray-700'}`}>
                          {l.score}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3">
                          <Link href={`/learners/${l.id}`}
                            className="text-xs font-semibold text-brand-700 hover:underline whitespace-nowrap">
                            View
                          </Link>
                          {isAdmin && (
                            <Link href={`/learners/${l.id}/edit`}
                              className="text-xs font-semibold text-gray-400 hover:text-brand-700 hover:underline">
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

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                <p className="text-xs text-gray-500">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100 transition-colors">
                    ← Prev
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const p = totalPages <= 7 ? i + 1
                      : page <= 4 ? i + 1
                      : page >= totalPages - 3 ? totalPages - 6 + i
                      : page - 3 + i;
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        className={`w-8 h-8 text-xs font-semibold rounded-lg transition-colors ${
                          page === p
                            ? 'bg-brand-700 text-white'
                            : 'hover:bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100 transition-colors">
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
