export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { emailLearnerReengagement } from '@/lib/email';
import { whatsappReengagement } from '@/lib/whatsapp';

// A learner is contacted at most once every COOLDOWN_DAYS days.
const COOLDOWN_DAYS   = 14;
// No-pulse trigger: no check-in in this many days.
const NO_PULSE_DAYS   = 14;
// Consecutive absence trigger: flag after this many consecutive absences.
const CONSEC_ABSENCES = 3;

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase  = await createClient();
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const now       = new Date();
  const cooloffAt = new Date(now.getTime() - COOLDOWN_DAYS * 86_400_000).toISOString();
  const pulseAt   = new Date(now.getTime() - NO_PULSE_DAYS  * 86_400_000).toISOString().slice(0, 10);

  // ── 1. Fetch all active learners with everything we need ──────────────────
  const { data: learnerRows, error } = await supabase
    .from('learners')
    .select(`
      learner_id,
      programme_status,
      program_enrollments(program_id, programs(program_name)),
      learner_profiles(first_name, last_name, email, parent_name, parent_contact, whatsapp_number, whatsapp_opted_in),
      attendance(status, session_date),
      risk_scores(risk_trajectory),
      learner_pulse(week_date)
    `)
    .eq('programme_status', 'active');

  if (error) {
    console.error('[reengagement-cron] fetch error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── 2. Recent outreach — build a set of learner_ids contacted recently ────
  const { data: recentRows } = await supabase
    .from('learner_reengagement')
    .select('learner_id')
    .gte('sent_at', cooloffAt);

  const recentlySent = new Set((recentRows ?? []).map((r: { learner_id: string }) => r.learner_id));

  // ── 3. Admins — for in-app notifications ─────────────────────────────────
  const { data: admins } = await supabase
    .from('users').select('user_id, full_name').eq('role', 'admin');

  const adminUserIds = (admins ?? []).map((a: { user_id: string }) => a.user_id);

  // ── 4. Coordinator name (first admin, fallback) ───────────────────────────
  const coordinatorName = (admins as Array<{ user_id: string; full_name: string }> ?? [])[0]?.full_name ?? 'Your Coordinator';

  // ── 5. Evaluate each learner ──────────────────────────────────────────────
  interface AttRow    { status: string; session_date: string }
  interface PulseRow  { week_date: string }
  interface EnrolRow  { program_id: string; programs: { program_name: string } | null }
  interface ProfileRow { first_name: string; last_name: string; email: string | null; parent_name: string | null; parent_contact: string | null; whatsapp_number?: string | null; whatsapp_opted_in?: boolean | null }
  interface RiskRow    { risk_trajectory: string | null }

  interface LRow {
    learner_id:          string;
    programme_status:    string;
    program_enrollments: EnrolRow[];
    learner_profiles:    ProfileRow | null;
    attendance:          AttRow[];
    risk_scores:         RiskRow | null;
    learner_pulse:       PulseRow[];
  }

  const rows = (learnerRows ?? []) as unknown as LRow[];

  let contacted = 0;
  const triggered: string[] = [];

  for (const learner of rows) {
    if (recentlySent.has(learner.learner_id)) continue;

    const profile     = learner.learner_profiles;
    const learnerName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim();

    // ── Trigger A: consecutive absences ──────────────────────────────────
    const sortedAtt = [...(learner.attendance ?? [])]
      .sort((a, b) => b.session_date.localeCompare(a.session_date));

    let consecAbsences = 0;
    for (const att of sortedAtt) {
      if (att.status === 'absent') { consecAbsences++; }
      else break;
    }

    // ── Trigger B: no pulse check-in in 14+ days ─────────────────────────
    const lastPulse = [...(learner.learner_pulse ?? [])]
      .sort((a, b) => b.week_date.localeCompare(a.week_date))[0] ?? null;

    const noPulse = !lastPulse || lastPulse.week_date < pulseAt;

    // ── Trigger C: risk trajectory declining or critical ──────────────────
    const trajectory = learner.risk_scores?.risk_trajectory ?? null;
    const badTrajectory = trajectory === 'declining' || trajectory === 'critical';

    // Determine highest-priority trigger
    let triggerReason: string | null  = null;
    let triggerDetail: string | null  = null;

    if (consecAbsences >= CONSEC_ABSENCES) {
      triggerReason = 'consecutive_absences';
      triggerDetail = `${consecAbsences} consecutive absences from recent sessions`;
    } else if (noPulse) {
      triggerReason = 'no_pulse';
      triggerDetail = lastPulse
        ? `No pulse check-in since ${lastPulse.week_date} (${NO_PULSE_DAYS}+ days ago)`
        : `No pulse check-in has ever been recorded`;
    } else if (badTrajectory) {
      triggerReason = 'risk_trajectory';
      triggerDetail = `Risk trajectory is ${trajectory}`;
    }

    if (!triggerReason || !triggerDetail) continue;

    const programName = (learner.program_enrollments ?? [])[0]?.programs?.program_name ?? 'Girls in STEM';

    // ── Send outreach ─────────────────────────────────────────────────────
    try {
      await Promise.all([
        emailLearnerReengagement({
          learnerEmail:    profile?.email ?? null,
          learnerName,
          parentEmail:     profile?.parent_contact ?? null,
          parentName:      profile?.parent_name ?? null,
          triggerDetail,
          programName,
          coordinatorName,
          appUrl,
          adminUserIds,
        }),
        whatsappReengagement({
          learnerNumber:   profile?.whatsapp_number,
          learnerOptedIn:  profile?.whatsapp_opted_in,
          learnerName,
          parentNumber:    profile?.whatsapp_number,
          parentOptedIn:   profile?.whatsapp_opted_in,
          parentName:      profile?.parent_name ?? null,
          triggerDetail,
          programName,
          coordinatorName,
        }),
      ]);

      // Log the outreach
      await supabase.from('learner_reengagement').insert({
        learner_id:     learner.learner_id,
        trigger_reason: triggerReason,
        trigger_detail: triggerDetail,
      });

      triggered.push(`${learnerName} (${triggerReason})`);
      contacted++;
    } catch (e: unknown) {
      console.error(`[reengagement-cron] failed for ${learnerName}:`, (e as Error).message);
    }
  }

  console.info(`[reengagement-cron] contacted ${contacted} learners:`, triggered);
  return NextResponse.json({ ok: true, contacted, triggered });
}
