import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { StatusBadge, GradeBadge, RiskBadge } from '@/components/ui/Badge';
import ChartCard from '@/components/charts/ChartCard';
import { AttendanceTrendChart, ScoreDistributionChart } from '@/components/charts/Charts';
import { fmt } from '@/utils';
import Link from 'next/link';
import { ArrowLeft, Users, CalendarCheck2, BarChart3, BookOpen } from 'lucide-react';
import { DS } from '@/components/platform/tokens';
import EnrolmentManager from './EnrolmentManager';

async function getProgramDetail(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('programs')
    .select(`
      *,
      users!instructor_id(full_name, email),
      schools(school_name, district, province),
      program_enrollments(
        enrollment_id, status, enrolled_at,
        learners(
          learner_id, learner_code, grade,
          learner_profiles(first_name, last_name),
          risk_scores(risk_level, attendance_rate, avg_score)
        )
      )
    `)
    .eq('program_id', id)
    .single();
  return data;
}

async function getProgramStats(id: string) {
  const supabase = await createClient();
  const [attRes, scoreRes] = await Promise.all([
    supabase.from('attendance').select('status, session_date').eq('program_id', id),
    supabase.from('assessments').select('grade_band, percentage').eq('program_id', id),
  ]);

  const att    = attRes.data || [];
  const scores = scoreRes.data || [];

  const attRate  = att.length
    ? Math.round(att.filter((a: any) => a.status === 'present').length / att.length * 100) : 0;
  const avgScore = scores.length
    ? Math.round(scores.reduce((s: number, a: any) => s + Number(a.percentage), 0) / scores.length) : 0;

  const weeks: Record<string, { present: number; total: number }> = {};
  for (const row of att) {
    const d   = new Date(row.session_date);
    const mon = new Date(d.setDate(d.getDate() - d.getDay() + 1));
    const w   = mon.toISOString().slice(0, 10);
    if (!weeks[w]) weeks[w] = { present: 0, total: 0 };
    weeks[w].total++;
    if (row.status === 'present') weeks[w].present++;
  }
  const attTrend = Object.entries(weeks)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-10)
    .map(([w, { present, total }]) => ({
      week: new Date(w).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' }),
      rate: Math.round((present / total) * 100),
      present, absent: total - present,
    }));

  const counts: Record<string, number> = { Distinction: 0, Merit: 0, Pass: 0, 'Needs Support': 0 };
  for (const s of scores) {
    if (s.grade_band && counts[s.grade_band] !== undefined) counts[s.grade_band]++;
  }
  const scoreDist = Object.entries(counts).map(([grade_band, count]) => ({
    grade_band: grade_band as any,
    count,
    percentage: scores.length ? Math.round(count / scores.length * 100) : 0,
  }));

  return { attRate, avgScore, attTrend, scoreDist };
}

interface Props { params: Promise<{ id: string }> }

const TYPE_COLOR: Record<string, string> = {
  'Coding':'#5B21B6','Robotics':'#1D4ED8','Coding & Robotics':'#4338CA',
  'Data Science':'#7E22CE','Design/Tech':'#9D174D','Mathematics':'#854D0E',
  'Science':'#166534','Math & Science':'#134E4A','AI/ML':'#9A3412','Electronics':'#155E75',
};

export default async function ProgramDetailPage({ params }: Props) {
  const { id } = await params;
  await requireAuth(['admin', 'instructor']);
  const [program, stats] = await Promise.all([
    getProgramDetail(id),
    getProgramStats(id),
  ]);
  if (!program) notFound();

  const enrollments = program.program_enrollments || [];
  const active      = enrollments.filter((e: any) => e.status === 'active');
  const completed   = enrollments.filter((e: any) => e.status === 'completed');
  const typeColor   = TYPE_COLOR[program.program_type] || DS.primary;

  return (
    <div className="max-w-6xl space-y-6">
      <Link href="/programs"
        className="inline-flex items-center gap-1.5 text-sm hover:underline"
        style={{ color: DS.textMuted }}>
        <ArrowLeft className="w-4 h-4" /> Back to Programmes
      </Link>

      {/* Header */}
      <div className="rounded-2xl p-6" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: DS.primaryLight }}>
            <BookOpen className="w-6 h-6" style={{ color: DS.primary }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold" style={{ color: DS.text }}>{program.program_name}</h1>
              <StatusBadge label={program.is_active ? 'active' : 'inactive'} />
            </div>
            <p className="mt-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${typeColor}18`, color: typeColor }}>
                {program.program_type}
              </span>
            </p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm" style={{ color: DS.textMuted }}>
              {(program.users as any)?.full_name && <span>👤 {(program.users as any).full_name}</span>}
              {(program.schools as any)?.school_name && <span>🏫 {(program.schools as any).school_name}</span>}
              <span>📅 {fmt.date(program.start_date)}{program.end_date ? ` → ${fmt.date(program.end_date)}` : ''}</span>
              <span>👥 {active.length}/{program.max_capacity} enrolled</span>
            </div>
            {program.description && (
              <p className="text-sm mt-2" style={{ color: DS.textMid }}>{program.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Learners',  value: active.length,        color: DS.primary },
          { label: 'Attendance Rate',  value: `${stats.attRate}%`,  color: stats.attRate >= 75 ? 'var(--ds-success)' : 'var(--ds-danger)' },
          { label: 'Avg Score',        value: `${stats.avgScore}%`, color: stats.avgScore >= 60 ? 'var(--ds-success)' : 'var(--ds-danger)' },
          { label: 'Completions',      value: completed.length,     color: '#818CF8' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl p-4 text-center"
            style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
            <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Attendance Trend" subtitle="Weekly session attendance rate">
          <AttendanceTrendChart data={stats.attTrend} />
        </ChartCard>
        <ChartCard title="Score Distribution" subtitle="Assessment grade bands">
          <ScoreDistributionChart data={stats.scoreDist} />
        </ChartCard>
      </div>

      {/* Enrolled learners — with add/remove */}
      <EnrolmentManager programId={program.program_id} enrolments={active} />
    </div>
  );
}
