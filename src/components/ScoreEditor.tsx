'use client'
import { useState } from 'react'
import type { Candidate } from '@/types'
import { Card, CardHeader, Btn, Input } from '@/components/ui'
import { updateScores, computeScore, getDecision } from '@/lib/data'
import { useRouter } from 'next/navigation'

export function ScoreEditor({ candidate }: { candidate: Candidate }) {
  const router = useRouter()
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState<{ text: string; ok: boolean } | null>(null)

  const [scores, setScores] = useState({
    ap_points:  candidate.ap_points  ?? '',
    aa_points:  candidate.aa_points  ?? '',
    math_raw:   candidate.math_raw   ?? '',
    sci_raw:    candidate.sci_raw    ?? '',
    psych_raw:  candidate.psych_raw  ?? '',
    video_avg:  candidate.video_avg  ?? '',
    notes:      candidate.score_notes ?? '',
  })

  const parsed = {
    ap_points:  scores.ap_points  !== '' ? Number(scores.ap_points)  : null,
    aa_points:  scores.aa_points  !== '' ? Number(scores.aa_points)  : null,
    math_raw:   scores.math_raw   !== '' ? Number(scores.math_raw)   : null,
    sci_raw:    scores.sci_raw    !== '' ? Number(scores.sci_raw)    : null,
    psych_raw:  scores.psych_raw  !== '' ? Number(scores.psych_raw)  : null,
    video_avg:  scores.video_avg  !== '' ? Number(scores.video_avg)  : null,
  }

  const liveScore    = computeScore(parsed)
  const completeCount = Object.values(parsed).filter(v => v != null).length
  const liveDecision = getDecision(liveScore, completeCount)

  const fields = [
    { key: 'ap_points' as const,  label: 'School Report',       max: 20,  placeholder: '0–20' },
    { key: 'aa_points' as const,  label: 'Academic Assessment',  max: 25,  placeholder: '0–25' },
    { key: 'math_raw'  as const,  label: 'Math Entry Test',      max: 50,  placeholder: '0–50' },
    { key: 'sci_raw'   as const,  label: 'Science Entry Test',   max: 50,  placeholder: '0–50' },
    { key: 'psych_raw' as const,  label: 'Psych Assessment',     max: 20,  placeholder: '0–20' },
    { key: 'video_avg' as const,  label: 'Video Pitch Average',  max: 15,  placeholder: '0–15' },
  ]

  async function handleSave() {
    setSaving(true)
    setMsg(null)
    const result = await updateScores(candidate.id, {
      ...parsed,
      notes: scores.notes || undefined,
    })
    setSaving(false)
    if (result.success) {
      setMsg({ text: 'Scores saved successfully', ok: true })
      router.refresh()
    } else {
      setMsg({ text: result.error ?? 'Save failed', ok: false })
    }
  }

  const decisionColors: Record<string, string> = {
    Accept:     'var(--green)',
    Waitlist:   'var(--amber)',
    Review:     'var(--red)',
    Incomplete: 'var(--text3)',
  }

  return (
    <Card>
      <CardHeader
        title="Edit Scores"
        action={
          <span className="mono text-xs" style={{ color: 'var(--text3)' }}>
            Live preview
          </span>
        }
      />

      {/* Live score preview banner */}
      <div
        className="flex items-center gap-6 px-5 py-3"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}
      >
        <div>
          <div className="text-xs" style={{ color: 'var(--text3)' }}>
            Composite score
          </div>
          <div
            className="serif font-medium"
            style={{
              fontSize: 28,
              lineHeight: 1,
              color: decisionColors[liveDecision] ?? 'var(--text)',
            }}
          >
            {liveScore}
          </div>
        </div>
        <div
          className="h-8 w-px"
          style={{ background: 'var(--border)' }}
        />
        <div>
          <div className="text-xs" style={{ color: 'var(--text3)' }}>Decision</div>
          <div
            className="text-sm font-semibold mt-0.5"
            style={{ color: decisionColors[liveDecision] }}
          >
            {liveDecision}
          </div>
        </div>
        <div
          className="h-8 w-px"
          style={{ background: 'var(--border)' }}
        />
        <div>
          <div className="text-xs" style={{ color: 'var(--text3)' }}>Components</div>
          <div className="text-sm font-semibold mt-0.5 mono" style={{ color: 'var(--text2)' }}>
            {completeCount}/6
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-2 gap-4 mb-4">
          {fields.map(f => (
            <div key={f.key}>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: 'var(--text2)' }}
              >
                {f.label}
                <span className="ml-1 font-normal" style={{ color: 'var(--text3)' }}>
                  /{f.max}
                </span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={f.max}
                  step={0.5}
                  placeholder={f.placeholder}
                  value={scores[f.key]}
                  onChange={e => setScores(s => ({ ...s, [f.key]: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none mono"
                  style={{
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                  onFocus={e => { e.currentTarget.style.border = '1px solid rgba(124,110,245,0.5)' }}
                  onBlur={e => { e.currentTarget.style.border = '1px solid var(--border)' }}
                />
                {/* Inline pct */}
                {scores[f.key] !== '' && (
                  <span
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs mono"
                    style={{ color: 'var(--text3)' }}
                  >
                    {Math.round((Number(scores[f.key]) / f.max) * 100)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text2)' }}>
            Assessor Notes
          </label>
          <textarea
            rows={2}
            placeholder="Optional notes about this candidate…"
            value={scores.notes}
            onChange={e => setScores(s => ({ ...s, notes: e.target.value }))}
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
            style={{
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontFamily: 'Figtree, sans-serif',
            }}
          />
        </div>

        {/* Save row */}
        <div className="flex items-center gap-3">
          <Btn onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Scores'}
          </Btn>
          {msg && (
            <span
              className="text-xs font-medium"
              style={{ color: msg.ok ? 'var(--green)' : 'var(--red)' }}
            >
              {msg.ok ? '✓ ' : '✕ '}{msg.text}
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}
