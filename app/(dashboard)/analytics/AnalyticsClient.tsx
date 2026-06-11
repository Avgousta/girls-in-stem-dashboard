'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts';
import { DS } from '@/components/platform/tokens';
import type { CohortRow } from './page';

type Dimension = 'school' | 'programme' | 'grade' | 'year';

interface Props {
  bySchool:    CohortRow[];
  byProgramme: CohortRow[];
  byGrade:     CohortRow[];
  byYear:      CohortRow[];
}

const DIMS: { key: Dimension; label: string }[] = [
  { key: 'school',    label: 'By School'     },
  { key: 'programme', label: 'By Programme'  },
  { key: 'grade',     label: 'By Grade'      },
  { key: 'year',      label: 'By Enrolment Year' },
];

const ATT_COLOR   = '#7C3AED';
const SCORE_COLOR = '#34D399';
const RISK_HIGH   = '#EF4444';
const RISK_MED    = '#FBBF24';
const RISK_LOW    = '#34D399';

function scoreColor(v: number) {
  return v >= 75 ? RISK_LOW : v >= 50 ? RISK_MED : RISK_HIGH;
}

interface ChartTooltipProps { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }
function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-xl"
      style={{ background: DS.bg, border: `1px solid ${DS.border}` }}>
      <p className="font-bold mb-1" style={{ color: DS.textMid }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color ?? DS.text }}>
          {p.name}: <strong>{p.value}{p.name.includes('Rate') || p.name.includes('Score') ? '%' : ''}</strong>
        </p>
      ))}
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <p className="text-sm font-bold" style={{ color: DS.text }}>{title}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>{sub}</p>}
    </div>
  );
}

function AttScoreChart({ data }: { data: CohortRow[] }) {
  const chartData = data.map(d => ({
    name:       d.key.length > 14 ? d.key.slice(0, 12) + '…' : d.key,
    fullName:   d.key,
    'Att Rate': d.att_rate,
    'Avg Score': d.avg_score,
    learners:   d.learners,
  }));

  return (
    <div className="rounded-2xl p-5" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
      <SectionHeader title="Attendance & Score Comparison" sub="Target: 75%+ attendance, 60%+ score" />
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barGap={4} barSize={18}>
          <CartesianGrid strokeDasharray="3 3" stroke={DS.borderLight as string} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: DS.textMuted as string }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: DS.textMuted as string }} axisLine={false} tickLine={false} unit="%" />
          <Tooltip content={<ChartTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: DS.textMuted as string }} />
          <Bar dataKey="Att Rate"  fill={ATT_COLOR}   radius={[4,4,0,0]} />
          <Bar dataKey="Avg Score" fill={SCORE_COLOR} radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RiskChart({ data }: { data: CohortRow[] }) {
  const chartData = data.map(d => ({
    name:   d.key.length > 14 ? d.key.slice(0, 12) + '…' : d.key,
    High:   d.high_risk,
    Medium: d.medium_risk,
    Low:    d.low_risk,
  }));

  return (
    <div className="rounded-2xl p-5" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
      <SectionHeader title="Risk Distribution" sub="Number of learners per risk band" />
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barGap={2} barSize={14}>
          <CartesianGrid strokeDasharray="3 3" stroke={DS.borderLight as string} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: DS.textMuted as string }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: DS.textMuted as string }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: DS.textMuted as string }} />
          <Bar dataKey="High"   fill={RISK_HIGH} stackId="risk" radius={[0,0,0,0]} />
          <Bar dataKey="Medium" fill={RISK_MED}  stackId="risk" radius={[0,0,0,0]} />
          <Bar dataKey="Low"    fill={RISK_LOW}  stackId="risk" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RadarCompare({ data }: { data: CohortRow[] }) {
  if (data.length < 2 || data.length > 8) return null;
  const radarData = [
    { metric: 'Attendance', ...Object.fromEntries(data.map(d => [d.key.slice(0,10), d.att_rate])) },
    { metric: 'Avg Score',  ...Object.fromEntries(data.map(d => [d.key.slice(0,10), d.avg_score])) },
    { metric: 'Low Risk %', ...Object.fromEntries(data.map(d => [d.key.slice(0,10), d.learners > 0 ? Math.round(d.low_risk / d.learners * 100) : 0])) },
  ];
  const COLORS = [ATT_COLOR, SCORE_COLOR, '#F97316', '#EC4899', '#06B6D4', '#84CC16', '#F59E0B', '#8B5CF6'];

  return (
    <div className="rounded-2xl p-5" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
      <SectionHeader title="Radar Comparison" sub="Attendance, score, and % low-risk learners" />
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={radarData}>
          <PolarGrid stroke={DS.borderLight as string} />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: DS.textMuted as string }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: DS.textMuted as string }} />
          {data.map((d, i) => (
            <Radar key={d.key} name={d.key} dataKey={d.key.slice(0,10)}
              stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.1} />
          ))}
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: DS.textMuted as string }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SummaryTable({ data }: { data: CohortRow[] }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
      <p className="text-xs font-bold uppercase tracking-wider px-5 py-4"
        style={{ color: DS.textMuted, borderBottom: `1px solid ${DS.border}` }}>
        Summary Table
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: DS.surfaceHover }}>
              {['Cohort', 'Learners', 'Att %', 'Score %', 'High Risk', 'Med Risk', 'Low Risk', 'Assessments'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: DS.textMuted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={d.key} style={{ borderTop: `1px solid ${DS.borderLight}`, background: i % 2 === 0 ? 'transparent' : DS.surfaceHover }}>
                <td className="px-4 py-2.5 font-semibold text-xs max-w-[140px] truncate" style={{ color: DS.text }}>{d.key}</td>
                <td className="px-4 py-2.5 text-xs font-bold tabular-nums" style={{ color: DS.primary }}>{d.learners}</td>
                <td className="px-4 py-2.5 text-xs font-bold tabular-nums" style={{ color: scoreColor(d.att_rate) }}>{d.att_rate}%</td>
                <td className="px-4 py-2.5 text-xs font-bold tabular-nums" style={{ color: scoreColor(d.avg_score) }}>{d.avg_score}%</td>
                <td className="px-4 py-2.5 text-xs tabular-nums" style={{ color: RISK_HIGH }}>{d.high_risk}</td>
                <td className="px-4 py-2.5 text-xs tabular-nums" style={{ color: RISK_MED }}>{d.medium_risk}</td>
                <td className="px-4 py-2.5 text-xs tabular-nums" style={{ color: RISK_LOW }}>{d.low_risk}</td>
                <td className="px-4 py-2.5 text-xs tabular-nums" style={{ color: DS.textMuted }}>{d.completions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AnalyticsClient({ bySchool, byProgramme, byGrade, byYear }: Props) {
  const [dim, setDim] = useState<Dimension>('school');

  const dataMap: Record<Dimension, CohortRow[]> = {
    school:    bySchool,
    programme: byProgramme,
    grade:     byGrade,
    year:      byYear,
  };

  const data = dataMap[dim];

  // Best / worst cohort callouts
  const best  = [...data].sort((a, b) => (b.att_rate + b.avg_score) - (a.att_rate + a.avg_score))[0];
  const worst = [...data].sort((a, b) => (a.att_rate + a.avg_score) - (b.att_rate + b.avg_score))[0];

  return (
    <div className="space-y-5">
      {/* Dimension tabs */}
      <div className="flex flex-wrap gap-2">
        {DIMS.map(d => (
          <button key={d.key} onClick={() => setDim(d.key)}
            className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all"
            style={dim === d.key
              ? { background: DS.primary, color: '#fff' }
              : { background: DS.surface, color: DS.textMid, border: `1px solid ${DS.border}` }}>
            {d.label}
          </button>
        ))}
      </div>

      {/* Insight callouts */}
      {data.length >= 2 && best && worst && best.key !== worst.key && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl p-4" style={{ background: 'var(--ds-success-light)', border: '1px solid var(--ds-success)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ds-success)' }}>
              Top Performing Cohort
            </p>
            <p className="text-sm font-bold" style={{ color: DS.text }}>{best.key}</p>
            <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>
              {best.att_rate}% attendance · {best.avg_score}% avg score · {best.learners} learners
            </p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: 'var(--ds-warn-light)', border: '1px solid var(--ds-warn)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ds-warn)' }}>
              Needs Most Support
            </p>
            <p className="text-sm font-bold" style={{ color: DS.text }}>{worst.key}</p>
            <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>
              {worst.att_rate}% attendance · {worst.avg_score}% avg score · {worst.high_risk} high risk
            </p>
          </div>
        </div>
      )}

      {data.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <p className="text-sm" style={{ color: DS.textMuted }}>No data available for this dimension.</p>
        </div>
      ) : (
        <>
          <AttScoreChart data={data} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <RiskChart data={data} />
            {data.length >= 2 && data.length <= 8
              ? <RadarCompare data={data} />
              : <div className="rounded-2xl p-5 flex items-center justify-center" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
                  <p className="text-xs text-center" style={{ color: DS.textMuted }}>
                    Radar chart available when comparing 2–8 cohorts.<br/>Current: {data.length}
                  </p>
                </div>
            }
          </div>

          <SummaryTable data={data} />
        </>
      )}
    </div>
  );
}
