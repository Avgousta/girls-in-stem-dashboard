import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import InterventionsClient from './InterventionsClient';
import Link from 'next/link';
import { AlertTriangle, Plus } from 'lucide-react';

interface RawUpdate { update_id: string; note: string; status_change: string | null; created_at: string; author: { full_name: string } | null }
interface RawIntervention {
  intervention_id: string; intervention_type: string | null; priority: string; reason: string;
  action_plan: string | null; action_taken: string | null; follow_up_date: string | null;
  due_date: string | null; status: string; created_at: string; resolved_at: string | null;
  learner_id: string;
  learners: { learner_id: string; learner_code: string; learner_profiles: { first_name: string; last_name: string } | null; schools: { school_name: string } | null; risk_scores: { risk_level: string; attendance_rate: number; avg_score: number } | null } | null;
  flagged_by_user: { full_name: string } | null;
  assigned_user: { full_name: string; user_id: string } | null;
  intervention_updates: RawUpdate[];
}
interface RawAtRiskRow {
  risk_level: string; attendance_rate: number; avg_score: number;
  learners: { learner_id: string; learner_code: string; learner_profiles: { first_name: string; last_name: string } | null; schools: { school_name: string } | null; interventions: Array<{ intervention_id: string; status: string; priority: string }> } | null;
}
interface RawActiveLearner { learner_id: string; learner_code: string; learner_profiles: { first_name: string; last_name: string } | null; schools: { school_name: string } | null }

async function getPageData() {
  const supabase = await createClient();

  const [intervRes, atRiskRes, learnersRes, instructorsRes] = await Promise.all([

    supabase.from('interventions').select(`
      intervention_id, intervention_type, priority, reason, action_plan,
      action_taken, follow_up_date, due_date, status, created_at, resolved_at,
      learner_id,
      learners!inner(
        learner_id, learner_code,
        learner_profiles(first_name, last_name),
        schools(school_name),
        risk_scores(risk_level, attendance_rate, avg_score)
      ),
      flagged_by_user:users!flagged_by(full_name),
      assigned_user:users!assigned_to(full_name, user_id),
      intervention_updates(
        update_id, note, status_change, created_at,
        author:users!author_id(full_name)
      )
    `).order('created_at', { ascending: false }),

    // At-risk: high + medium, include linked intervention status
    supabase.from('risk_scores').select(`
      risk_level, attendance_rate, avg_score,
      learners!inner(
        learner_id, learner_code,
        learner_profiles(first_name, last_name),
        schools(school_name),
        interventions(intervention_id, status, priority)
      )
    `).in('risk_level', ['high', 'medium']),

    supabase.from('learners')
      .select(`learner_id, learner_code,
        learner_profiles(first_name, last_name),
        schools(school_name)`)
      .eq('programme_status', 'active').order('learner_code'),

    supabase.from('users')
      .select('user_id, full_name').in('role', ['admin', 'instructor']).order('full_name'),
  ]);

  const interventions = ((intervRes.data || []) as unknown as RawIntervention[]).map(i => ({
    id:           i.intervention_id,
    type:         i.intervention_type || 'academic',
    priority:     i.priority || 'medium',
    reason:       i.reason,
    action_plan:  i.action_plan  || '',
    action_taken: i.action_taken || '',
    follow_up:    i.follow_up_date,
    due_date:     i.due_date,
    status:       i.status,
    created:      i.created_at,
    resolved_at:  i.resolved_at,
    learner_id:   i.learner_id,
    learner:      `${i.learners?.learner_profiles?.first_name ?? ''} ${i.learners?.learner_profiles?.last_name ?? ''}`.trim(),
    school:       i.learners?.schools?.school_name ?? '—',
    risk:         i.learners?.risk_scores?.risk_level ?? 'low',
    att:          Math.floor(i.learners?.risk_scores?.attendance_rate ?? 0),
    score:        Math.round(i.learners?.risk_scores?.avg_score ?? 0),
    flagged_by:   i.flagged_by_user?.full_name ?? '—',
    assigned_to:  i.assigned_user?.full_name  ?? null,
    assigned_id:  i.assigned_user?.user_id    ?? null,
    updates: (i.intervention_updates || [])
      .map(u => ({
        id: u.update_id, note: u.note, status_change: u.status_change,
        created: u.created_at, author: u.author?.full_name ?? '—',
      }))
      .sort((a, b) => a.created.localeCompare(b.created)),
  }));

  const atRisk = ((atRiskRes.data || []) as unknown as RawAtRiskRow[]).map(r => {
    const l        = r.learners!;
    const openI    = (l.interventions || []).filter(i => i.status !== 'resolved');
    const critI    = openI.find(i => i.priority === 'critical' || i.priority === 'high');
    return {
      learner_id:            l.learner_id,
      learner:               `${l.learner_profiles?.first_name ?? ''} ${l.learner_profiles?.last_name ?? ''}`.trim(),
      school:                l.schools?.school_name ?? '—',
      risk:                  r.risk_level,
      att:                   Math.floor(r.attendance_rate ?? 0),
      score:                 Math.round(r.avg_score ?? 0),
      open_interventions:    openI.length,
      has_critical:          !!critI,
    };
  }).sort((a, b) => {
    const order = { high: 0, medium: 1 };
    return (order[a.risk as keyof typeof order] ?? 2) - (order[b.risk as keyof typeof order] ?? 2);
  });

  // Aggregate stats
  const open        = interventions.filter(i => i.status === 'open').length;
  const inProgress  = interventions.filter(i => i.status === 'in_progress').length;
  const resolved    = interventions.filter(i => i.status === 'resolved').length;
  const critical    = interventions.filter(i => i.priority === 'critical' && i.status !== 'resolved').length;
  const overdue     = interventions.filter(i =>
    i.due_date && new Date(i.due_date) < new Date() && i.status !== 'resolved').length;
  const resRate     = interventions.length ? Math.round(resolved / interventions.length * 100) : 0;

  // Avg days to resolve
  const resolvedWithDates = interventions.filter(i => i.status === 'resolved' && i.resolved_at);
  const avgDaysToResolve  = resolvedWithDates.length
    ? Math.round(resolvedWithDates.reduce((sum, i) => {
        return sum + (new Date(i.resolved_at!).getTime() - new Date(i.created).getTime()) / 86400000;
      }, 0) / resolvedWithDates.length)
    : null;

  // Type distribution
  const typeDist: Record<string, number> = {};
  interventions.forEach(i => { typeDist[i.type] = (typeDist[i.type] || 0) + 1; });

  return {
    interventions, atRisk,
    stats: { open, inProgress, resolved, critical, overdue, resRate, avgDaysToResolve, typeDist },
    learners: ((learnersRes.data || []) as unknown as RawActiveLearner[]).map(l => ({
      learner_id: l.learner_id,
      full_name:  `${l.learner_profiles?.first_name ?? ''} ${l.learner_profiles?.last_name ?? ''}`.trim(),
      school:     l.schools?.school_name ?? '',
    })),
    instructors: instructorsRes.data || [],
  };
}

export default async function InterventionsPage() {
  const user = await requireAuth(['admin', 'instructor']);
  const data = await getPageData();

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--ds-text)' }}>
            <AlertTriangle className="w-6 h-6" style={{ color: 'var(--ds-warn)' }} />
            Interventions
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ds-text-mid)' }}>
            {data.interventions.length} total · {data.stats.open} open
            {data.stats.critical > 0 && ` · `}
            {data.stats.critical > 0 && (
              <span className="font-semibold" style={{ color: 'var(--ds-danger)' }}>{data.stats.critical} critical</span>
            )}
            {data.stats.overdue > 0 && ` · `}
            {data.stats.overdue > 0 && (
              <span className="font-semibold" style={{ color: 'var(--ds-danger)' }}>{data.stats.overdue} overdue</span>
            )}
          </p>
        </div>
        <Link href="/interventions/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Log Intervention
        </Link>
      </div>

      <InterventionsClient {...data} currentUserId={user.user_id} />
    </div>
  );
}
