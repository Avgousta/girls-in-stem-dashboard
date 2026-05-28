import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, differenceInDays } from 'date-fns';
import type { GradeBand, RiskLevel } from '@/types';

// ── Class name utility ─────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Date utilities ─────────────────────────────────────────────────────────────
export const fmt = {
  date:     (d: string) => format(parseISO(d), 'dd MMM yyyy'),
  dateShort:(d: string) => format(parseISO(d), 'dd/MM/yy'),
  datetime: (d: string) => format(parseISO(d), 'dd MMM yyyy HH:mm'),
  iso:      (d: Date)   => format(d, 'yyyy-MM-dd'),
  month:    (d: string) => format(parseISO(d), 'MMM yyyy'),
};

export const today = () => fmt.iso(new Date());
export const daysUntil = (date: string) => differenceInDays(parseISO(date), new Date());

// ── Maths utilities ────────────────────────────────────────────────────────────
export const pct = (n: number, d: number) => d === 0 ? 0 : Math.round((n / d) * 100);
export const round2 = (n: number) => Math.round(n * 100) / 100;
export const avg = (nums: number[]) => nums.length === 0 ? 0 : round2(nums.reduce((a, b) => a + b, 0) / nums.length);

// ── Grade band calculation ─────────────────────────────────────────────────────
export function calcGradeBand(percentage: number): GradeBand {
  if (percentage >= 80) return 'Distinction';
  if (percentage >= 70) return 'Merit';
  if (percentage >= 60) return 'Pass';
  return 'Needs Support';
}

// ── Risk level calculation ─────────────────────────────────────────────────────
export function calcRiskLevel(attendanceRate: number, avgScore: number): RiskLevel {
  if (attendanceRate < 75 || avgScore < 50)  return 'high';
  if (attendanceRate < 85 || avgScore < 60)  return 'medium';
  return 'low';
}

export function calcRiskFlags(attendanceRate: number, avgScore: number): string[] {
  const flags: string[] = [];
  if (attendanceRate < 75) flags.push(`Low attendance: ${pct(attendanceRate, 100)}%`);
  if (avgScore < 50)       flags.push(`Low avg score: ${round2(avgScore)}%`);
  if (attendanceRate < 85 && attendanceRate >= 75) flags.push(`At-risk attendance: ${pct(attendanceRate, 100)}%`);
  if (avgScore < 60 && avgScore >= 50)             flags.push(`At-risk score: ${round2(avgScore)}%`);
  return flags;
}

// ── ID generation ─────────────────────────────────────────────────────────────
export const padId = (prefix: string, n: number, len = 3) =>
  `${prefix}${String(n).padStart(len, '0')}`;

// ── Colour maps ───────────────────────────────────────────────────────────────
export const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; dot: string }> = {
  low:    { bg: 'bg-mint-400/10',  text: 'text-mint-600',   dot: 'bg-mint-400' },
  medium: { bg: 'bg-yellow-400/10',text: 'text-yellow-600', dot: 'bg-yellow-400' },
  high:   { bg: 'bg-red-400/10',   text: 'text-red-600',    dot: 'bg-red-400' },
};

export const STATUS_COLORS: Record<string, string> = {
  present:   'bg-mint-400/15 text-mint-700',
  absent:    'bg-red-100 text-red-700',
  late:      'bg-yellow-100 text-yellow-700',
  excused:   'bg-blue-100 text-blue-700',
  active:    'bg-mint-400/15 text-mint-700',
  inactive:  'bg-gray-100 text-gray-600',
  graduated: 'bg-brand-100 text-brand-700',
  withdrawn: 'bg-red-100 text-red-700',
  open:      'bg-red-100 text-red-700',
  in_progress:'bg-yellow-100 text-yellow-700',
  resolved:  'bg-mint-400/15 text-mint-700',
  completed: 'bg-mint-400/15 text-mint-700',
  not_started:'bg-gray-100 text-gray-600',
  Distinction:'bg-brand-100 text-brand-700',
  Merit:     'bg-mint-400/15 text-mint-700',
  Pass:      'bg-yellow-100 text-yellow-700',
  'Needs Support':'bg-red-100 text-red-700',
};

// ── CSV export ────────────────────────────────────────────────────────────────
export function exportToCsv<T extends Record<string, unknown>>(data: T[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}_${today()}.csv`;
  a.click();
}

// ── Truncate ──────────────────────────────────────────────────────────────────
export const truncate = (s: string, n: number) =>
  s.length > n ? s.slice(0, n) + '…' : s;
