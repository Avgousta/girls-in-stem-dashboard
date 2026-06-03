'use client'
import { useState } from 'react'
import { Card, CardHeader, scoreColor, DecisionBadge } from '@/components/ui'
import { computeScore, getDecision } from '@/lib/scoring'

const WEIGHTS = [
  { label: 'Academic Assessment',  field: 'aa_points' as const, max: 25, weight: 25, color: '#34d399', desc: 'In-house Math + Science test' },
  { label: 'School Report',        field: 'ap_points' as const, max: 20, weight: 20, color: '#7c6ef5', desc: 'Historical grades (Math, Sci, Eng)' },
  { label: 'Math Entry Test',      field: 'math_raw'  as const, max: 50, weight: 15, color: '#6ee7b7', desc: 'Microsoft Forms MCQ — 25 questions' },
  { label: 'Science Entry Test',   field: 'sci_raw'   as const, max: 50, weight: 15, color: '#fbbf24', desc: 'Microsoft Forms MCQ — 25 questions' },
  { label: 'Psych Assessment',     field: 'psych_raw' as const, max: 20, weight: 15, color: '#f9a8d4', desc: 'Growth mindset & resilience (10 Qs)' },
  { label: 'Video Pitch',          field: 'video_avg' as const, max: 15, weight: 10, color: '#f87171', desc: 'Judge panel average score' },
]

type Fields = {
  ap_points: number | null
  aa_points: number | null
  math_raw: number | null
  sci_raw: number | null
  psych_raw: number | null
  video_avg: number | null
}

const DEMO: Fields = {
  ap_points: 18,
  aa_points: 22,
  math_raw:  46,
  sci_raw:   44,
  psych_raw: 10,
  video_avg: 12,
}

export function ScoringCalculator() {
  const [scores, setScores] = useState<Fields>(DEMO)

  const compositeScore = computeScore(scores)
  const complete       = Object.values(scores).filter(v => v != null).length
  const decision       = getDecision(compositeScore, complete)

  const decisionColor = {
    Accept: 'var(--green)', Waitlist: 'var(--amber)',
    Review: 'var(--red)', Incomplete: 'var(--text3)',
  }[decision] ?? 'var(--text3)'

  function set(field: keyof Fields, raw: string) {
    const v = raw === '' ? null : Number(raw)
    setScores(s => ({ ...s, [field]: v }))
  }

  return (
    <div className="p-8 space-y-6">

      {/* Weight cards */}
      <div className="grid grid-cols-3 gap-4">
        {WEIGHTS.map(w => (
          <Card key={w.field}>
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    {w.label}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                    {w.desc}
                  </div>
                </div>
                <div
                  className="mono font-semibold text-sm px-2 py-0.5 rounded-full"
                  style={{ color: w.color, background: `${w.color}20` }}
                >
                  {w.weight}%
                </div>
              </div>

              {/* Slider + input */}
              <input
                type="range"
                min={0}
                max={w.max}
                step={0.5}
                value={scores[w.field] ?? 0}
                onChange={e => set(w.field, e.target.value)}
                className="w-full mb-2 cursor-pointer"
                style={{ accentColor: w.color }}
              />

              <div className="flex items-center justify-between">
                <input
                  type="number"
                  min={0}
                  max={w.max}
                  step={0.5}
                  value={scores[w.field] ?? ''}
                  placeholder="—"
                  onChange={e => set(w.field, e.target.value)}
                  className="mono w-16 text-sm text-center rounded-lg px-2 py-1 outline-none"
                  style={{
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    color: w.color,
                  }}
                />
                <span className="text-xs" style={{ color: 'var(--text3)' }}>
                  / {w.max}
                </span>
                <span
                  className="mono text-xs font-semibold"
                  style={{ color: w.color }}
                >
                  {scores[w.field] != null
                    ? `${Math.round((scores[w.field]! / w.max) * w.weight * 10) / 10} pts`
                    : '—'
                  }
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Result banner */}
      <div
        className="rounded-2xl p-6 flex items-center justify-between"
        style={{ background: 'var(--bg2)', border: `1px solid ${decisionColor}30` }}
      >
        <div>
          <div className="text-xs mb-1" style={{ color: 'var(--text3)' }}>
            Composite Score
          </div>
          <div
            className="serif font-medium"
            style={{ fontSize: 64, lineHeight: 1, color: decisionColor }}
          >
            {compositeScore}
          </div>
          <div className="text-sm mt-1" style={{ color: 'var(--text3)' }}>
            out of 100
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs mb-2" style={{ color: 'var(--text3)' }}>Decision</div>
          <DecisionBadge decision={decision} />
          <div className="mt-3 text-xs" style={{ color: 'var(--text3)' }}>
            {complete}/6 components filled
          </div>
        </div>

        {/* Formula breakdown */}
        <div
          className="rounded-xl p-4 mono text-xs space-y-1 self-stretch flex flex-col justify-center"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', minWidth: 300 }}
        >
          {WEIGHTS.map(w => {
            const raw       = scores[w.field]
            const contrib   = raw != null ? Math.round((raw / w.max) * w.weight * 10) / 10 : 0
            return (
              <div key={w.field} className="flex justify-between gap-4" style={{ color: 'var(--text2)' }}>
                <span style={{ color: 'var(--text3)' }}>{w.label.substring(0, 20)}</span>
                <span style={{ color: raw != null ? w.color : 'var(--text3)' }}>
                  {raw != null ? `${raw}/${w.max} × ${w.weight}% = ${contrib}` : '—'}
                </span>
              </div>
            )
          })}
          <div
            className="pt-2 mt-2 flex justify-between font-medium"
            style={{ borderTop: '1px solid var(--border)', color: decisionColor }}
          >
            <span>Total</span>
            <span>{compositeScore} / 100</span>
          </div>
        </div>
      </div>

      {/* Thresholds */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Accept',     range: '≥ 70',  color: 'var(--green)', bg: 'var(--green-bg)', action: 'Send acceptance email + onboarding pack' },
          { label: 'Waitlist',   range: '55–69', color: 'var(--amber)', bg: 'var(--amber-bg)', action: 'Reserve a place, notify if space opens' },
          { label: 'Review',     range: '< 55',  color: 'var(--red)',   bg: 'var(--red-bg)',   action: 'Director reviews before final decision' },
          { label: 'Incomplete', range: '—',     color: 'var(--text3)', bg: 'rgba(255,255,255,0.03)', action: 'Chase missing data from school' },
        ].map(t => (
          <div
            key={t.label}
            className="rounded-2xl p-4"
            style={{ background: t.bg, border: `1px solid ${t.color}30` }}
          >
            <div
              className="serif font-medium mb-1"
              style={{ fontSize: 28, color: t.color, lineHeight: 1 }}
            >
              {t.range}
            </div>
            <div className="font-semibold text-sm mb-1" style={{ color: t.color }}>
              {t.label}
            </div>
            <div className="text-xs" style={{ color: 'var(--text3)' }}>
              {t.action}
            </div>
          </div>
        ))}
      </div>

      {/* Reset */}
      <div className="flex gap-3">
        <button
          onClick={() => setScores(DEMO)}
          className="text-xs px-4 py-2 rounded-lg transition-all hover:opacity-80"
          style={{
            background: 'rgba(124,110,245,0.1)',
            color: 'var(--accent2)',
            border: '1px solid rgba(124,110,245,0.2)',
          }}
        >
          Load demo scores
        </button>
        <button
          onClick={() => setScores({ ap_points: null, aa_points: null, math_raw: null, sci_raw: null, psych_raw: null, video_avg: null })}
          className="text-xs px-4 py-2 rounded-lg transition-all hover:opacity-80"
          style={{
            background: 'transparent',
            color: 'var(--text3)',
            border: '1px solid var(--border)',
          }}
        >
          Clear all
        </button>
      </div>
    </div>
  )
}
