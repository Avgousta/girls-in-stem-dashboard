import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import RiskAlertCard from '@/components/ui/RiskAlertCard';
import RecalculateButton from './RecalculateButton';
import { AlertTriangle, TrendingDown, Users } from 'lucide-react';
import type { RiskLevel } from '@/types';

async function getRiskData() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('risk_scores')
    .select(`
      *,
      learners!inner(
        learner_id, learner_code,
        learner_profiles(first_name, last_name),
        schools(school_name),
        program_enrollments(programs(program_name))
      )
    `)
    .order('risk_level', { ascending: false })
    .order('attendance_rate', { ascending: true });

  return (data || []).map((r: any) => ({
    ...r,
    learner_name: `${r.learners.learner_profiles?.first_name} ${r.learners.learner_profiles?.last_name}`,
    school_name:  r.learners.schools?.school_name,
    programme_name: r.learners.program_enrollments?.[0]?.programs?.program_name,
  }));
}

export default async function RiskDashboardPage() {
  await requireAuth(['admin', 'instructor']);
  const risks = await getRiskData();

  const high   = risks.filter(r => r.risk_level === 'high');
  const medium = risks.filter(r => r.risk_level === 'medium');
  const low    = risks.filter(r => r.risk_level === 'low');

  const tabs: Array<{ key: RiskLevel | 'all'; label: string; count: number; color: string }> = [
    { key: 'all',    label: 'All',     count: risks.length,  color: 'text-gray-700' },
    { key: 'high',   label: 'High',    count: high.length,   color: 'text-red-600' },
    { key: 'medium', label: 'Medium',  count: medium.length, color: 'text-yellow-600' },
    { key: 'low',    label: 'Low',     count: low.length,    color: 'text-mint-600' },
  ];

  return (
    <div className="max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            Risk Monitor
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Automatically flagged learners based on attendance and assessment thresholds
          </p>
        </div>
        <RecalculateButton />
      </div>

      {/* Rules callout */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <TrendingDown className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-amber-800">Risk Rules</p>
          <p className="text-amber-700 mt-0.5">
            <strong>HIGH:</strong> Attendance &lt; 75% OR Avg score &lt; 50% ·
            <strong className="ml-2">MEDIUM:</strong> Attendance 75–84% OR Avg score 50–59% ·
            <strong className="ml-2">LOW:</strong> All thresholds met
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'High Risk', count: high.length, color: 'bg-red-50 border-red-200 text-red-700', dot: 'bg-red-500' },
          { label: 'Medium Risk', count: medium.length, color: 'bg-yellow-50 border-yellow-200 text-yellow-700', dot: 'bg-yellow-500' },
          { label: 'Low Risk', count: low.length, color: 'bg-mint-400/5 border-mint-400/30 text-mint-700', dot: 'bg-mint-400' },
        ].map(({ label, count, color, dot }) => (
          <div key={label} className={`rounded-xl border p-4 ${color}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
              <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-3xl font-bold tabular-nums">{count}</p>
            <p className="text-xs opacity-70 mt-0.5">learners</p>
          </div>
        ))}
      </div>

      {/* High risk section */}
      {high.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            High Risk — Immediate Action Required ({high.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {high.map(r => <RiskAlertCard key={r.score_id} risk={r} />)}
          </div>
        </section>
      )}

      {/* Medium risk section */}
      {medium.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            Medium Risk — Monitor Closely ({medium.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {medium.map(r => <RiskAlertCard key={r.score_id} risk={r} />)}
          </div>
        </section>
      )}

      {high.length === 0 && medium.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Users className="w-12 h-12 text-mint-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-800">All learners on track</h3>
          <p className="text-gray-400 text-sm mt-1">No high or medium risk learners detected.</p>
        </div>
      )}
    </div>
  );
}
