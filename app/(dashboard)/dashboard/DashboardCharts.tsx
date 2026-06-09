'use client';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { DS } from '@/components/platform/tokens';

interface TrendPoint { w: string; r: number }

interface TTP { name:string; value:number; color?:string; fill?:string }
function ChartTooltip({ active, payload, label }: { active?:boolean; payload?:TTP[]; label?:string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-xl"
      style={{ background: DS.bg, border: `1px solid ${DS.border}` }}>
      <p className="font-bold mb-0.5" style={{ color: DS.textMid }}>{label}</p>
      <p style={{ color: '#818CF8' }}>
        Attendance: <strong>{payload[0]?.value}%</strong>
      </p>
    </div>
  );
}

export function AttendanceTrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-36">
        <p className="text-sm" style={{ color: DS.textMuted }}>Not enough data yet</p>
      </div>
    );
  }

  const chartData = data.map(d => ({ week: d.w, 'Att %': d.r }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={chartData} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#818CF8" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#818CF8" stopOpacity={0}   />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={DS.borderLight as string} vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 10, fill: DS.textMuted as string }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: DS.textMuted as string }}
          axisLine={false} tickLine={false} width={28} tickFormatter={v => `${v}%`} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="Att %" stroke="#818CF8" strokeWidth={2.5}
          fill="url(#attGrad)" dot={{ fill: '#818CF8', r: 3 }} activeDot={{ r: 5 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
