import { getCandidates, getCohortStats, getSchoolStats } from '@/lib/server-data'
import { StatCard, Card, CardHeader, PageHeader, DecisionBadge, ScoreBar, scoreColor, RankChip } from '@/components/ui'
import { DashboardCharts } from '@/components/DashboardCharts'
import Link from 'next/link'

export const revalidate = 60 // refresh data every 60 seconds

export default async function DashboardPage() {
  const [candidates, stats, schools] = await Promise.all([
    getCandidates(),
    getCohortStats(),
    getSchoolStats(),
  ])

  const top8 = candidates.slice(0, 8)

  // Score distribution buckets
  const buckets = [
    { label: '80–100', min: 80, max: 101, color: 'var(--green)' },
    { label: '70–79',  min: 70, max: 80,  color: '#6ee7b7' },
    { label: '55–69',  min: 55, max: 70,  color: 'var(--amber)' },
    { label: '< 55',   min: 0,  max: 55,  color: 'var(--red)' },
  ].map(b => ({
    ...b,
    count: candidates.filter(c =>
      (c.composite_score ?? 0) >= b.min &&
      (c.composite_score ?? 0) <  b.max
    ).length,
  }))

  return (
    <div>
      <PageHeader
        title="Dashboard Overview"
        subtitle={`2025 cohort — ${candidates.length} candidates across ${stats?.schools ?? 0} schools`}
        actions={
          <Link href="/candidates">
            <span
              className="text-xs font-medium px-3 py-2 rounded-lg transition-all hover:opacity-80"
              style={{ background: 'rgba(124,110,245,0.15)', color: 'var(--accent2)', border: '1px solid rgba(124,110,245,0.2)' }}
            >
              View all candidates →
            </span>
          </Link>
        }
      />

      <div className="p-8 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-5 gap-4">
          <StatCard label="Total Candidates"  value={stats?.total       ?? 0}  sub="2025 cohort"       accentColor="var(--accent)"  delay={0} />
          <StatCard label="Accepted"          value={stats?.accepted    ?? 0}  sub="Score ≥ 70"        accentColor="var(--green)"   delay={1} />
          <StatCard label="Waitlisted"        value={stats?.waitlisted  ?? 0}  sub="Score 55–69"       accentColor="var(--amber)"   delay={2} />
          <StatCard label="Manual Review"     value={stats?.review      ?? 0}  sub="Score < 55"        accentColor="var(--red)"     delay={3} />
          <StatCard label="Avg Score"         value={`${stats?.avg_score ?? 0}`} sub={`Top: ${stats?.top_score ?? 0}`} accentColor="var(--accent2)" delay={4} />
        </div>

        {/* Main row */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 320px' }}>

          {/* Top Candidates Table */}
          <Card>
            <CardHeader
              title="Top Candidates"
              action={<Link href="/candidates" className="hover:underline">View all →</Link>}
            />
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Rank', 'Candidate', 'School', 'Score', 'Decision'].map(h => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-semibold tracking-widest uppercase"
                      style={{ color: 'var(--text3)', fontSize: 10 }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {top8.map(c => (
                  <tr
                    key={c.id}
                    className="transition-colors hover:bg-white/[0.02] cursor-pointer"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td className="px-5 py-3.5">
                      <RankChip rank={c.rank} />
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/candidates/${c.id}`}>
                        <span className="font-medium text-sm hover:underline" style={{ color: 'var(--text)' }}>
                          {c.full_name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--text2)' }}>
                      {c.school_name}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-20">
                          <ScoreBar value={c.composite_score} max={100} color={scoreColor(c.composite_score)} />
                        </div>
                        <span
                          className="mono font-medium text-sm"
                          style={{ color: scoreColor(c.composite_score) }}
                        >
                          {c.composite_score ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <DecisionBadge decision={c.decision} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Right column */}
          <div className="space-y-4">
            {/* Decision breakdown */}
            <Card>
              <CardHeader title="Decision Breakdown" />
              <div className="p-5 space-y-3">
                {[
                  { label: 'Accept',     count: stats?.accepted   ?? 0, color: 'var(--green)', total: stats?.total ?? 1 },
                  { label: 'Waitlist',   count: stats?.waitlisted ?? 0, color: 'var(--amber)', total: stats?.total ?? 1 },
                  { label: 'Review',     count: stats?.review     ?? 0, color: 'var(--red)',   total: stats?.total ?? 1 },
                  { label: 'Incomplete', count: stats?.incomplete  ?? 0, color: 'var(--text3)', total: stats?.total ?? 1 },
                ].map(item => (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex justify-between text-xs" style={{ color: 'var(--text2)' }}>
                      <span>{item.label}</span>
                      <span className="mono font-medium" style={{ color: item.color }}>
                        {item.count}
                      </span>
                    </div>
                    <div
                      className="rounded-full overflow-hidden"
                      style={{ height: 6, background: 'rgba(255,255,255,0.05)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(item.count / item.total) * 100}%`,
                          background: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Score Distribution */}
            <Card>
              <CardHeader title="Score Distribution" />
              <div className="p-5 space-y-2">
                {buckets.map(b => (
                  <div key={b.label} className="flex items-center gap-3">
                    <span className="mono text-xs w-12" style={{ color: 'var(--text3)' }}>
                      {b.label}
                    </span>
                    <div
                      className="flex-1 rounded-full overflow-hidden"
                      style={{ height: 18, background: 'rgba(255,255,255,0.04)' }}
                    >
                      <div
                        className="h-full rounded-full flex items-center pl-2.5 text-xs font-semibold"
                        style={{
                          width: `${(b.count / candidates.length) * 100}%`,
                          background: b.color,
                          color: '#000',
                          minWidth: b.count > 0 ? 28 : 0,
                        }}
                      >
                        {b.count > 0 ? b.count : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* School summary */}
            <Card>
              <CardHeader title="By School" />
              <div className="p-5 space-y-3">
                {schools.map((s, i) => (
                  <div key={s.school_name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span style={{ color: 'var(--text)' }}>{s.school_name}</span>
                      <span className="mono" style={{ color: 'var(--text3)' }}>
                        {s.candidates} · avg {s.avg_score}
                      </span>
                    </div>
                    <div
                      className="rounded-full overflow-hidden"
                      style={{ height: 4, background: 'rgba(255,255,255,0.05)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(s.avg_score / 100) * 100}%`,
                          background: ['#7c6ef5', '#34d399', '#fbbf24', '#f87171'][i % 4],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Charts row */}
        <DashboardCharts candidates={candidates} />
      </div>
    </div>
  )
}
