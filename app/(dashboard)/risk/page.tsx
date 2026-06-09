import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import RiskClient from './RiskClient';
import RecalculateButton from './RecalculateButton';
import { AlertTriangle, TrendingDown } from 'lucide-react';

async function getRiskData() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('risk_scores')
    .select(`
      score_id, risk_level, attendance_rate, avg_score, risk_flags, last_calculated,
      learner_id,
      learners!inner(
        learner_id, learner_code,
        learner_profiles(first_name, last_name),
        schools(school_name),
        program_enrollments(programs(program_name))
      )
    `)
    .order('risk_level', { ascending: false })
    .order('attendance_rate', { ascending: true });

  interface RRow { score_id:string; risk_level:string; attendance_rate:number|null; avg_score:number|null; risk_flags:string[]|null; last_calculated:string; learner_id:string; learners:{learner_profiles:{first_name:string;last_name:string}|null;schools:{school_name:string}|null;program_enrollments:Array<{programs:{program_name:string}|null}>}|null }
  const risks = ((data || []) as unknown as RRow[]).map(r => ({
    score_id:        r.score_id,
    risk_level:      r.risk_level as 'high' | 'medium' | 'low',
    attendance_rate: Math.floor(r.attendance_rate ?? 0),
    avg_score:       Math.round(r.avg_score ?? 0),
    risk_flags:      r.risk_flags ?? [],
    last_calculated: r.last_calculated,
    learner_id:      r.learner_id,
    learner_name:    `${r.learners?.learner_profiles?.first_name ?? ''} ${r.learners?.learner_profiles?.last_name ?? ''}`.trim(),
    school_name:     r.learners?.schools?.school_name ?? '—',
    programme_name:  r.learners?.program_enrollments?.[0]?.programs?.program_name ?? null,
  }));

  // Unique school list for filter
  const schools = Array.from(new Set(risks.map(r => r.school_name).filter(s => s !== '—'))).sort();

  return { risks, schools };
}

export default async function RiskDashboardPage() {
  const user = await requireAuth(['admin', 'instructor']);
  const { risks, schools } = await getRiskData();

  const high   = risks.filter(r => r.risk_level === 'high').length;
  const medium = risks.filter(r => r.risk_level === 'medium').length;

  return (
    <div className="max-w-7xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--ds-text)' }}>
            <AlertTriangle className="w-6 h-6" style={{ color: 'var(--ds-danger)' }} />
            Risk Monitor
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>
            {risks.length} learners tracked ·{' '}
            {high > 0 && (
              <span className="font-semibold" style={{ color: 'var(--ds-danger)' }}>
                {high} high risk
              </span>
            )}
            {high > 0 && medium > 0 && ' · '}
            {medium > 0 && (
              <span className="font-semibold" style={{ color: 'var(--ds-warn)' }}>
                {medium} medium risk
              </span>
            )}
          </p>
        </div>
        <RecalculateButton />
      </div>

      {/* Rules callout */}
      <div className="rounded-xl p-4 flex gap-3"
        style={{ background: 'var(--ds-warn-light)', border: '1px solid var(--ds-warn)' }}>
        <TrendingDown className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--ds-warn)' }} />
        <div className="text-sm">
          <p className="font-semibold" style={{ color: 'var(--ds-warn)' }}>Risk Rules</p>
          <p className="mt-0.5" style={{ color: 'var(--ds-text-mid)' }}>
            <strong>HIGH:</strong> Attendance &lt; 75% OR Avg score &lt; 50% ·{' '}
            <strong>MEDIUM:</strong> Attendance 75–84% OR Avg score 50–59% ·{' '}
            <strong>LOW:</strong> All thresholds met
          </p>
        </div>
      </div>

      <RiskClient risks={risks} schools={schools} currentUserId={user.user_id} />
    </div>
  );
}
