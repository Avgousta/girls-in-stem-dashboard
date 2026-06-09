export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications';

const STALE_DAYS = 14;

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase  = await createClient();
  const cutoff    = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString().slice(0, 10);

  // Fetch high+medium risk learners with their last session and last mentor
  const { data: riskRows, error } = await supabase
    .from('risk_scores')
    .select(`
      risk_level,
      learners!inner(
        learner_id,
        learner_profiles(first_name, last_name),
        mentorship_sessions(
          session_id, session_date, mentor_id,
          mentor:users!mentor_id(user_id, full_name)
        )
      )
    `)
    .in('risk_level', ['high', 'medium']);

  if (error) {
    console.error('[cadence-cron] fetch error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch all admins as fallback notifcation targets
  const { data: admins } = await supabase
    .from('users').select('user_id').eq('role', 'admin');

  const adminIds: string[] = (admins ?? []).map(a => a.user_id);

  interface CadenceSession { session_id: string; session_date: string; mentor_id: string; mentor: { user_id: string; full_name: string } | null }
  interface CadenceRow { risk_level: string; learners: { learner_id: string; learner_profiles: { first_name: string; last_name: string } | null; mentorship_sessions: CadenceSession[] } | null }
  const rows = (riskRows ?? []) as unknown as CadenceRow[];

  let notified = 0;
  const stale: string[] = [];

  for (const row of rows) {
    const learner  = row.learners;
    if (!learner) continue;
    const sessions = learner.mentorship_sessions ?? [];

    const lastSession = [...sessions]
      .sort((a, b) => b.session_date.localeCompare(a.session_date))[0] ?? null;

    const isStale = !lastSession || lastSession.session_date < cutoff;
    if (!isStale) continue;

    const learnerName = `${learner.learner_profiles?.first_name ?? ''} ${learner.learner_profiles?.last_name ?? ''}`.trim();
    const daysSince   = lastSession
      ? Math.floor((Date.now() - new Date(lastSession.session_date).getTime()) / 86_400_000)
      : null;
    const subText = daysSince != null
      ? `Last session was ${daysSince} days ago — check in soon.`
      : `No sessions have been logged yet.`;

    stale.push(learnerName);

    // Notify last mentor, fall back to all admins
    const targetIds: string[] = lastSession?.mentor?.user_id
      ? [lastSession.mentor.user_id]
      : adminIds;

    await Promise.all(targetIds.map(uid =>
      createNotification({
        user_id: uid,
        type:    'mentorship_cadence_alert',
        title:   `Session overdue — ${learnerName}`,
        body:    subText,
      })
    ));

    notified++;
  }

  console.info(`[cadence-cron] notified for ${notified} stale learners:`, stale);
  return NextResponse.json({ ok: true, notified, stale });
}