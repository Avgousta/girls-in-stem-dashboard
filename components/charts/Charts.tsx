'use client';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import type { AttendanceTrend, ScoreDistribution, SchoolComparison, ProgramProgress } from '@/types';

const COLORS = {
  purple: '#4F2D7F', mint: '#2DD4A0', blue: '#3B82F6',
  yellow: '#F59E0B', red: '#EF4444', gray: '#9CA3AF',
};
const GRADE_COLORS: Record<string, string> = {
  Distinction: COLORS.purple, Merit: COLORS.mint,
  Pass: COLORS.yellow, 'Needs Support': COLORS.red,
};

const tooltipStyle = {
  contentStyle: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 },
  labelStyle: { fontWeight: 600, color: '#374151' },
};

// ── Attendance Trend Chart ────────────────────────────────────────────────────
export function AttendanceTrendChart({ data }: { data: AttendanceTrend[] }) {
  if (!data?.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={COLORS.purple} stopOpacity={0.15} />
            <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, 'Attendance Rate']} />
        <Area type="monotone" dataKey="rate" stroke={COLORS.purple} strokeWidth={2}
          fill="url(#attGrad)" dot={{ fill: COLORS.purple, r: 3 }} activeDot={{ r: 5 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Score Distribution Chart ──────────────────────────────────────────────────
export function ScoreDistributionChart({ data }: { data: ScoreDistribution[] }) {
  if (!data?.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis dataKey="grade_band" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} formatter={(v: number, _: string, p) => [v, p.payload.grade_band]} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.grade_band} fill={GRADE_COLORS[entry.grade_band] || COLORS.gray} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── School Comparison Chart ───────────────────────────────────────────────────
export function SchoolComparisonChart({ data }: { data: SchoolComparison[] }) {
  if (!data?.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 50)}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="school_name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={75} />
        <Tooltip {...tooltipStyle} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="avg_attendance" name="Attendance %" fill={COLORS.purple} radius={[0, 4, 4, 0]} barSize={10} />
        <Bar dataKey="avg_score" name="Avg Score %" fill={COLORS.mint} radius={[0, 4, 4, 0]} barSize={10} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Program Progress (Donut) ───────────────────────────────────────────────────
export function ProgramProgressChart({ data }: { data: ProgramProgress[] }) {
  if (!data?.length) return <EmptyChart />;
  const flat = data.flatMap(p => [
    { name: `${p.program_name} · Active`, value: p.active, color: COLORS.purple },
    { name: `${p.program_name} · Done`, value: p.completed, color: COLORS.mint },
  ]).filter(d => d.value > 0);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={flat} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
          paddingAngle={2} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
          labelLine={false}>
          {flat.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Pie>
        <Tooltip {...tooltipStyle} formatter={(v: number, n: string) => [v, n]} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Risk Distribution ─────────────────────────────────────────────────────────
export function RiskDistributionChart({ low, medium, high }: { low: number; medium: number; high: number }) {
  const data = [
    { name: 'Low Risk',    value: low,    color: COLORS.mint },
    { name: 'Medium Risk', value: medium, color: COLORS.yellow },
    { name: 'High Risk',   value: high,   color: COLORS.red },
  ].filter(d => d.value > 0);

  if (!data.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
          paddingAngle={3} dataKey="value">
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Pie>
        <Tooltip {...tooltipStyle} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function EmptyChart() {
  return (
    <div className="h-48 flex items-center justify-center text-sm text-gray-400 bg-gray-50 rounded-lg">
      No data available
    </div>
  );
}
