import { getCandidates, getCohortStats, getSchoolStats } from '@/lib/server-data'
import { PageHeader, Card, CardHeader, DecisionBadge, scoreColor } from '@/components/ui'
import { ReportsClient } from '@/components/ReportsClient'

export const revalidate = 60

export default async function ReportsPage() {
  const [candidates, stats, schools] = await Promise.all([
    getCandidates(),
    getCohortStats(),
    getSchoolStats(),
  ])

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle={`2025 cohort — ${candidates.length} candidates`}
        actions={
          <ReportsClient candidates={candidates} exportOnly />
        }
      />

      <div className="p-8 space-y-6">

        {/* School performance */}
        <Card>
          <CardHeader title="School Performance" />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
                  {['School', 'Province', 'Candidates', 'Accepted', 'Acceptance Rate', 'Avg Score', 'Top Score'].map(h => (
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
                {schools.map((s, i) => (
                  <tr
                    key={s.school_name}
                    className="transition-colors hover:bg-white/[0.02]"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td className="px-5 py-4 font-medium text-sm" style={{ color: 'var(--text)' }}>
                      {s.school_name}
                    </td>
                    <td className="px-5 py-4 text-xs" style={{ color: 'var(--text3)' }}>
                      {s.province}
                    </td>
                    <td className="px-5 py-4 mono text-sm text-center">{s.candidates}</td>
                    <td className="px-5 py-4 mono text-sm text-center" style={{ color: 'var(--green)' }}>
                      {s.accepted}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="rounded-full overflow-hidden"
                          style={{ height: 6, width: 80, background: 'rgba(255,255,255,0.05)' }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${s.acceptance_rate_pct ?? 0}%`,
                              background: ['#7c6ef5','#34d399','#fbbf24','#f87171'][i % 4],
                            }}
                          />
                        </div>
                        <span className="mono text-xs" style={{ color: 'var(--text2)' }}>
                          {s.acceptance_rate_pct ?? 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 mono font-semibold text-sm"
                      style={{ color: scoreColor(s.avg_score) }}>
                      {s.avg_score}
                    </td>
                    <td className="px-5 py-4 mono text-sm" style={{ color: scoreColor(s.top_score) }}>
                      {s.top_score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Issues audit */}
        <Card>
          <CardHeader title="Data Quality Audit" />
          <div className="p-5 space-y-2">
            {[
              {
                sev: '🔴',
                issue: 'Interview scores missing for all 31 candidates',
                fix: 'Collect scores from all 5 judges — this component is excluded from current rankings',
                urgent: true,
              },
              {
                sev: '🔴',
                issue: 'Psych scores are 0 for many high-performing candidates',
                fix: 'Review scoring rubric with assessors — candidates gave strong answers but scored 0',
                urgent: true,
              },
              {
                sev: '🟠',
                issue: `${candidates.filter(c => c.components_complete < 4).length} candidates have fewer than 4 scored components`,
                fix: 'Chase schools for missing test results before finalising acceptance list',
                urgent: false,
              },
              {
                sev: '🟡',
                issue: `${candidates.filter(c => !c.email).length} candidates have no email address on file`,
                fix: 'Request email from school coordinators for acceptance notifications',
                urgent: false,
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-4 rounded-xl p-4"
                style={{
                  background: item.urgent ? 'rgba(248,113,113,0.05)' : 'var(--bg3)',
                  border: `1px solid ${item.urgent ? 'rgba(248,113,113,0.15)' : 'var(--border)'}`,
                }}
              >
                <span className="text-lg shrink-0 mt-0.5">{item.sev}</span>
                <div>
                  <div className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                    {item.issue}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text3)' }}>
                    → {item.fix}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Full data table */}
        <Card>
          <CardHeader
            title="Full Candidate Report"
            action={<ReportsClient candidates={candidates} exportOnly />}
          />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
                  {['#','Name','School','AP','AA','Math','Sci','Psych','Video','Score','Decision'].map(h => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold tracking-widest uppercase"
                      style={{ color: 'var(--text3)', fontSize: 10 }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => (
                  <tr
                    key={c.id}
                    className="transition-colors hover:bg-white/[0.02]"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td className="px-4 py-3 mono text-xs" style={{ color: 'var(--text3)' }}>{i + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text)' }}>{c.full_name}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text2)' }}>{c.school_name}</td>
                    {[c.ap_points, c.aa_points, c.math_raw, c.sci_raw, c.psych_raw, c.video_avg].map((v, j) => (
                      <td key={j} className="px-4 py-3 mono text-xs" style={{ color: v != null ? 'var(--text2)' : 'var(--text3)' }}>
                        {v ?? '—'}
                      </td>
                    ))}
                    <td className="px-4 py-3 mono font-semibold text-sm"
                      style={{ color: scoreColor(c.composite_score) }}>
                      {c.composite_score ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <DecisionBadge decision={c.decision} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
