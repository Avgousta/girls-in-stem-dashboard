'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Candidate } from '@/types'
import { DecisionBadge, ScoreBar, scoreColor, RankChip, ScoreCell } from '@/components/ui'

type Filter = 'all' | 'Accept' | 'Waitlist' | 'Review' | 'Incomplete'
type SortKey = 'rank' | 'name' | 'score' | 'school'

export function CandidatesTable({ candidates }: { candidates: Candidate[] }) {
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState<Filter>('all')
  const [school, setSchool]     = useState('')
  const [sortKey, setSortKey]   = useState<SortKey>('rank')
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('asc')

  const schools = useMemo(
    () => Array.from(new Set(candidates.map(c => c.school_name))).sort(),
    [candidates]
  )

  const counts = useMemo(() => ({
    all:        candidates.length,
    Accept:     candidates.filter(c => c.decision === 'Accept').length,
    Waitlist:   candidates.filter(c => c.decision === 'Waitlist').length,
    Review:     candidates.filter(c => c.decision === 'Review').length,
    Incomplete: candidates.filter(c => c.decision === 'Incomplete').length,
  }), [candidates])

  const sorted = useMemo(() => {
    const q = search.toLowerCase()
    let list = candidates.filter(c => {
      const matchSearch = !q ||
        c.full_name.toLowerCase().includes(q) ||
        c.school_name.toLowerCase().includes(q)
      const matchFilter = filter === 'all' || c.decision === filter
      const matchSchool = !school || c.school_name === school
      return matchSearch && matchFilter && matchSchool
    })

    list.sort((a, b) => {
      let va: any, vb: any
      if (sortKey === 'rank')   { va = a.rank;             vb = b.rank }
      if (sortKey === 'name')   { va = a.full_name;        vb = b.full_name }
      if (sortKey === 'score')  { va = a.composite_score ?? -1; vb = b.composite_score ?? -1 }
      if (sortKey === 'school') { va = a.school_name;      vb = b.school_name }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [candidates, search, filter, school, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? <span style={{ color: 'var(--accent)' }}>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>
      : <span style={{ color: 'var(--text3)' }}> ↕</span>

  const FilterBtn = ({ f, label }: { f: Filter; label: string }) => (
    <button
      onClick={() => setFilter(f)}
      className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
      style={{
        background: filter === f ? 'rgba(124,110,245,0.2)' : 'transparent',
        color:      filter === f ? 'var(--accent2)' : 'var(--text3)',
        border:     filter === f
          ? '1px solid rgba(124,110,245,0.3)'
          : '1px solid var(--border)',
      }}
    >
      {label}
    </button>
  )

  return (
    <div className="p-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Search */}
        <input
          type="text"
          placeholder="Search candidates…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm outline-none"
          style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            width: 220,
          }}
        />

        {/* Decision filters */}
        <div className="flex items-center gap-2">
          <FilterBtn f="all"        label={`All (${counts.all})`} />
          <FilterBtn f="Accept"     label={`✓ Accept (${counts.Accept})`} />
          <FilterBtn f="Waitlist"   label={`⏳ Waitlist (${counts.Waitlist})`} />
          <FilterBtn f="Review"     label={`⚠ Review (${counts.Review})`} />
          <FilterBtn f="Incomplete" label={`○ Incomplete (${counts.Incomplete})`} />
        </div>

        {/* School filter */}
        <select
          value={school}
          onChange={e => setSchool(e.target.value)}
          className="text-xs rounded-full px-3 py-1.5 outline-none"
          style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            color: 'var(--text2)',
          }}
        >
          <option value="">All schools</option>
          {schools.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <span className="ml-auto text-xs" style={{ color: 'var(--text3)' }}>
          {sorted.length} result{sorted.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--border)', background: 'var(--bg2)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
                {[
                  { label: 'Rank',         key: 'rank'   as SortKey },
                  { label: 'Candidate',    key: 'name'   as SortKey },
                  { label: 'School',       key: 'school' as SortKey },
                  { label: 'AP /20',       key: null },
                  { label: 'AA /25',       key: null },
                  { label: 'Math /50',     key: null },
                  { label: 'Sci /50',      key: null },
                  { label: 'Psych /20',    key: null },
                  { label: 'Video /15',    key: null },
                  { label: 'Total /100',   key: 'score' as SortKey },
                  { label: 'Decision',     key: null },
                  { label: '',             key: null },
                ].map(({ label, key }) => (
                  <th
                    key={label}
                    onClick={() => key && toggleSort(key)}
                    className="text-left px-4 py-3 text-xs font-semibold tracking-widest uppercase"
                    style={{
                      color: 'var(--text3)',
                      fontSize: 10,
                      cursor: key ? 'pointer' : 'default',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                    {key && <SortIcon k={key} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(c => (
                <tr
                  key={c.id}
                  className="group transition-colors hover:bg-white/[0.02]"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <td className="px-4 py-3">
                    <RankChip rank={c.rank} />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/candidates/${c.id}`}>
                      <span
                        className="font-medium text-sm hover:underline"
                        style={{ color: 'var(--text)' }}
                      >
                        {c.full_name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text2)' }}>
                    {c.school_name}
                  </td>
                  <td className="px-4 py-3"><ScoreCell value={c.ap_points} /></td>
                  <td className="px-4 py-3"><ScoreCell value={c.aa_points} /></td>
                  <td className="px-4 py-3"><ScoreCell value={c.math_raw} /></td>
                  <td className="px-4 py-3"><ScoreCell value={c.sci_raw} /></td>
                  <td className="px-4 py-3"><ScoreCell value={c.psych_raw} /></td>
                  <td className="px-4 py-3"><ScoreCell value={c.video_avg} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ScoreBar
                        value={c.composite_score}
                        max={100}
                        color={scoreColor(c.composite_score)}
                      />
                      <span
                        className="mono font-semibold text-sm"
                        style={{ color: scoreColor(c.composite_score), minWidth: 32 }}
                      >
                        {c.composite_score ?? '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <DecisionBadge decision={c.decision} />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/candidates/${c.id}`}>
                      <span
                        className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--accent2)' }}
                      >
                        View →
                      </span>
                    </Link>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={12}
                    className="text-center py-12 text-sm"
                    style={{ color: 'var(--text3)' }}
                  >
                    No candidates match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
