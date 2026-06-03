import { getCandidate } from '@/lib/server-data'
import { notFound } from 'next/navigation'
import { PageHeader, Card, CardHeader, DecisionBadge, ScoreBar, scoreColor, RankChip } from '@/components/ui'
import { ScoreEditor } from '@/components/ScoreEditor'

export const revalidate = 30

export default async function CandidatePage({ params }: { params: { id: string } }) {
  const candidate = await getCandidate(params.id)
  if (!candidate) notFound()

  const c = candidate

  const components = [
    { label: 'School Report',     field: 'ap_points',  value: c.ap_points,  max: 20,  weight: 20, color: '#7c6ef5' },
    { label: 'Academic Assess',   field: 'aa_points',  value: c.aa_points,  max: 25,  weight: 25, color: '#34d399' },
    { label: 'Math Entry Test',   field: 'math_raw',   value: c.math_raw,   max: 50,  weight: 15, color: '#6ee7b7' },
    { label: 'Science Entry Test',field: 'sci_raw',    value: c.sci_raw,    max: 50,  weight: 15, color: '#fbbf24' },
    { label: 'Psych Assessment',  field: 'psych_raw',  value: c.psych_raw,  max: 20,  weight: 15, color: '#f9a8d4' },
    { label: 'Video Pitch',       field: 'video_avg',  value: c.video_avg,  max: 15,  weight: 10, color: '#f87171' },
  ]

  return (
    <div>
      <PageHeader
        title={c.full_name}
        subtitle={`${c.school_name} · Grade ${c.grade} · 2025 cohort`}
        actions={
          <div className="flex items-center gap-3">
            <RankChip rank={c.rank} />
            <DecisionBadge decision={c.decision} />
          </div>
        }
      />

      <div className="p-8 space-y-6">
        {/* Hero score */}
        <div
          className="rounded-2xl p-6 flex items-center gap-8"
          style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Big initials */}
          <div
            className="shrink-0 rounded-2xl flex items-center justify-center serif font-medium text-2xl"
            style={{
              width: 72, height: 72,
              background: 'linear-gradient(135deg, rgba(124,110,245,0.4), rgba(192,132,252,0.3))',
              border: '1px solid rgba(124,110,245,0.3)',
              color: 'var(--accent2)',
            }}
          >
            {c.first_name[0]}{c.surname[0]}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="text-sm mb-1" style={{ color: 'var(--text2)' }}>
              {c.school_name}
            </div>
            <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--text3)' }}>
              {c.email && <span>✉ {c.email}</span>}
              {c.contact_phone && <span>☏ {c.contact_phone}</span>}
              <span>Applied {new Date(c.applied_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span>{c.components_complete}/6 components scored</span>
            </div>
          </div>

          {/* Score */}
          <div className="text-right shrink-0">
            <div
              className="serif font-medium"
              style={{ fontSize: 56, lineHeight: 1, color: scoreColor(c.composite_score) }}
            >
              {c.composite_score ?? '—'}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text3)' }}>
              out of 100
            </div>
          </div>
        </div>

        {/* Score components grid */}
        <div className="grid grid-cols-3 gap-4">
          {components.map(comp => {
            const pct = comp.value != null ? (comp.value / comp.max) * 100 : 0
            const weighted = comp.value != null
              ? Math.round((comp.value / comp.max) * comp.weight * 10) / 10
              : null
            return (
              <Card key={comp.field}>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>
                        {comp.label}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                        Weight: {comp.weight}%
                      </div>
                    </div>
                    <div
                      className="text-xs font-semibold px-2 py-0.5 rounded-full mono"
                      style={{
                        background: comp.value != null ? `${comp.color}20` : 'rgba(255,255,255,0.04)',
                        color: comp.value != null ? comp.color : 'var(--text3)',
                      }}
                    >
                      {comp.value != null ? `${weighted} pts` : 'Missing'}
                    </div>
                  </div>

                  {/* Big number */}
                  <div className="flex items-baseline gap-1 mb-3">
                    <span
                      className="serif font-medium"
                      style={{ fontSize: 32, color: comp.value != null ? comp.color : 'var(--text3)', lineHeight: 1 }}
                    >
                      {comp.value ?? '—'}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--text3)' }}>
                      /{comp.max}
                    </span>
                  </div>

                  {/* Bar */}
                  <div
                    className="rounded-full overflow-hidden"
                    style={{ height: 6, background: 'rgba(255,255,255,0.05)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: comp.color }}
                    />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Score editor + actions */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 280px' }}>
          <ScoreEditor candidate={c} />

          {/* Actions panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader title="Actions" />
              <div className="p-4 space-y-2">
                <ActionButton
                  candidateId={c.id}
                  status="Accepted"
                  label="✓ Mark as Accepted"
                  color="var(--green)"
                  bg="var(--green-bg)"
                  border="rgba(52,211,153,0.2)"
                />
                <ActionButton
                  candidateId={c.id}
                  status="Waitlisted"
                  label="⏳ Move to Waitlist"
                  color="var(--amber)"
                  bg="var(--amber-bg)"
                  border="rgba(251,191,36,0.2)"
                />
                <ActionButton
                  candidateId={c.id}
                  status="Declined"
                  label="✕ Decline"
                  color="var(--red)"
                  bg="var(--red-bg)"
                  border="rgba(248,113,113,0.2)"
                />
              </div>
            </Card>

            <Card>
              <CardHeader title="Data Completeness" />
              <div className="p-4 space-y-2">
                {components.map(comp => (
                  <div key={comp.field} className="flex items-center gap-2 text-xs">
                    <span
                      style={{
                        color: comp.value != null ? 'var(--green)' : 'var(--text3)',
                      }}
                    >
                      {comp.value != null ? '✓' : '○'}
                    </span>
                    <span style={{ color: comp.value != null ? 'var(--text)' : 'var(--text3)' }}>
                      {comp.label}
                    </span>
                  </div>
                ))}
                <div
                  className="mt-3 pt-3 text-xs font-medium"
                  style={{
                    borderTop: '1px solid var(--border)',
                    color: c.components_complete === 6 ? 'var(--green)' : 'var(--amber)',
                  }}
                >
                  {c.components_complete}/6 complete
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// Inline action button (client component)
function ActionButton({
  candidateId, status, label, color, bg, border,
}: {
  candidateId: string
  status: string
  label: string
  color: string
  bg: string
  border: string
}) {
  return (
    <form action={async () => {
      'use server'
      const { updateCandidateStatus } = await import('@/lib/data')
      await updateCandidateStatus(candidateId, status)
    }}>
      <button
        type="submit"
        className="w-full text-left text-xs font-medium px-3 py-2.5 rounded-lg transition-all hover:opacity-80"
        style={{ color, background: bg, border: `1px solid ${border}` }}
      >
        {label}
      </button>
    </form>
  )
}
