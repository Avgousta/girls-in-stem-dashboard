export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err } from '@/app/api/helpers';

function deriveType(flags: string[]): string {
  if (flags.includes('low_attendance')) return 'attendance';
  if (flags.includes('low_score') || flags.includes('failing')) return 'academic';
  if (flags.includes('behavioural')) return 'behavioural';
  return 'academic';
}

function deriveReason(flags: string[], att: number, score: number): string {
  const parts: string[] = [];
  if (flags.includes('low_attendance') || att < 75)
    parts.push(`attendance at ${att}%`);
  if (flags.includes('low_score') || flags.includes('failing') || score < 50)
    parts.push(`average score at ${score}%`);
  if (parts.length === 0 && flags.length > 0)
    parts.push(...flags.map(f => f.replace(/_/g, ' ')));
  return `Auto-flagged: ${parts.join('; ') || 'elevated risk score'}.`;
}

export async function POST(_req: NextRequest) {
  const { supabase, profile, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  // Fetch high + medium risk learners with learner info and existing open interventions
  const { data: riskRows, error: riskErr } = await supabase
    .from('risk_scores')
    .select(`
      learner_id, risk_level, attendance_rate, avg_score, risk_flags,
      learners!inner(
        learner_id,
        interventions(intervention_id, status)
      )
    `)
    .in('risk_level', ['high', 'medium']);

  if (riskErr) return err(riskErr.message, 500);

  interface AutoFlagRow { learner_id: string; risk_level: string; attendance_rate: number; avg_score: number; risk_flags: string[] | null; learners: { learner_id: string; interventions: Array<{ intervention_id: string; status: string }> } | null }
  const rows = (riskRows ?? []) as unknown as AutoFlagRow[];

  const toFlag = rows.filter(r => {
    const openCount = (r.learners?.interventions ?? [])
      .filter(i => i.status !== 'resolved').length;
    return openCount === 0;
  });

  if (toFlag.length === 0) {
    return ok({ created: 0, skipped: rows.length, message: 'All at-risk learners already have open interventions.' });
  }

  const inserts = toFlag.map(r => {
    const flags   = r.risk_flags ?? [];
    const att     = Math.round(r.attendance_rate ?? 0);
    const score   = Math.round(r.avg_score ?? 0);
    const priority = r.risk_level === 'high' ? 'high' : 'medium';
    return {
      learner_id:        r.learner_id,
      flagged_by:        profile!.user_id,
      intervention_type: deriveType(flags),
      priority,
      reason:            deriveReason(flags, att, score),
      status:            'open',
    };
  });

  const { data: created, error: insertErr } = await supabase
    .from('interventions')
    .insert(inserts)
    .select('intervention_id, learner_id, priority, intervention_type');

  if (insertErr) return err(insertErr.message, 500);

  return ok({
    created:  created?.length ?? 0,
    skipped:  (riskRows ?? []).length - toFlag.length,
    message:  `${created?.length ?? 0} intervention${(created?.length ?? 0) === 1 ? '' : 's'} created automatically.`,
    interventions: created,
  });
}