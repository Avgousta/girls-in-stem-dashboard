'use client'
import type { Candidate } from '@/types'

export function ReportsClient({
  candidates,
  exportOnly,
}: {
  candidates: Candidate[]
  exportOnly?: boolean
}) {
  function exportCSV() {
    const headers = [
      'Rank','Full Name','School','Grade','Status',
      'AP Points /20','AA Points /25','Math Raw /50','Sci Raw /50',
      'Psych Raw /20','Video Avg /15','Composite Score','Components Complete','Decision'
    ]
    const rows = candidates.map(c => [
      c.rank, c.full_name, c.school_name, c.grade, c.status,
      c.ap_points ?? '', c.aa_points ?? '', c.math_raw ?? '',
      c.sci_raw ?? '', c.psych_raw ?? '', c.video_avg ?? '',
      c.composite_score ?? '', c.components_complete, c.decision ?? ''
    ])
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${v}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `girls-in-stem-2025-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={exportCSV}
      className="text-xs font-medium px-3 py-2 rounded-lg transition-all hover:opacity-80"
      style={{
        background: 'rgba(52,211,153,0.1)',
        color: 'var(--green)',
        border: '1px solid rgba(52,211,153,0.2)',
      }}
    >
      ↓ Export CSV
    </button>
  )
}
