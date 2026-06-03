'use client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { Card, CardHeader, scoreColor } from '@/components/ui'
import type { Candidate } from '@/types'

const COLORS = ['#7c6ef5', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#6ee7b7']

export function DashboardCharts({ candidates }: { candidates: Candidate[] }) {
  // Component averages
  const componentData = [
    { name: 'School Report',  avg: avg(candidates.map(c => c.ap_points).filter(Boolean) as number[]),  max: 20, weight: '20%' },
    { name: 'Academic Test',  avg: avg(candidates.map(c => c.aa_points).filter(Boolean) as number[]),  max: 25, weight: '25%' },
    { name: 'Math Entry',     avg: avg(candidates.map(c => c.math_raw).filter(Boolean) as number[]),   max: 50, weight: '15%' },
    { name: 'Science Entry',  avg: avg(candidates.map(c => c.sci_raw).filter(Boolean) as number[]),    max: 50, weight: '15%' },
    { name: 'Psych Assess',   avg: avg(candidates.map(c => c.psych_raw).filter(Boolean) as number[]),  max: 20, weight: '15%' },
    { name: 'Video Pitch',    avg: avg(candidates.map(c => c.video_avg).filter(Boolean) as number[]),  max: 15, weight: '10%' },
  ]

  // Score histogram
  const histoBuckets = Array.from({ length: 10 }, (_, i) => {
    const lo = i * 10, hi = lo + 10
    return {
      range: `${lo}–${hi}`,
      count: candidates.filter(c => {
        const s = c.composite_score ?? 0
        return s >= lo && s < hi
      }).length,
    }
  })

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Average by component */}
      <Card>
        <CardHeader title="Average Score by Component" />
        <div className="p-5">
          <div className="space-y-3">
            {componentData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-3">
                <div className="text-xs w-28 shrink-0" style={{ color: 'var(--text2)' }}>
                  {d.name}
                  <span className="ml-1 text-xs" style={{ color: 'var(--text3)' }}>
                    {d.weight}
                  </span>
                </div>
                <div
                  className="flex-1 rounded-full overflow-hidden"
                  style={{ height: 10, background: 'rgba(255,255,255,0.05)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(d.avg / d.max) * 100}%`,
                      background: COLORS[i],
                      transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
                    }}
                  />
                </div>
                <span className="mono text-xs w-14 text-right" style={{ color: COLORS[i] }}>
                  {d.avg.toFixed(1)} / {d.max}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Score histogram */}
      <Card>
        <CardHeader title="Score Distribution Histogram" />
        <div className="p-5" style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={histoBuckets} barCategoryGap="20%">
              <XAxis
                dataKey="range"
                tick={{ fill: 'var(--text3)', fontSize: 9, fontFamily: 'DM Mono' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--text3)', fontSize: 10, fontFamily: 'DM Mono' }}
                axisLine={false}
                tickLine={false}
                width={20}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{
                  background: 'var(--bg3)',
                  border: '1px solid var(--border2)',
                  borderRadius: 8,
                  color: 'var(--text)',
                  fontFamily: 'DM Mono',
                  fontSize: 12,
                }}
                labelStyle={{ color: 'var(--text2)' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {histoBuckets.map((entry, i) => {
                  const midScore = i * 10 + 5
                  return (
                    <Cell
                      key={`cell-${i}`}
                      fill={scoreColor(midScore)}
                      fillOpacity={0.8}
                    />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

function avg(arr: number[]): number {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}
