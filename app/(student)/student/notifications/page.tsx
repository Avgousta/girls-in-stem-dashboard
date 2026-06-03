import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Bell } from 'lucide-react';
import { fmt } from '@/utils';

export default async function StudentNotificationsPage() {
  const user = await requireAuth(['learner']);
  const supabase = await createClient();

  const { data: learner } = await supabase
    .from('learners').select('learner_id').eq('user_id', user.user_id).single();

  const learnerId = (learner as any)?.learner_id;

  // Build notifications from real data
  const notifications: Array<{type:string;title:string;body:string;time:string;color:string;icon:string}> = [];

  if (learnerId) {
    // Recent assessments
    const { data: assessments } = await supabase
      .from('assessments')
      .select('subject, percentage, grade_band, assessment_date')
      .eq('learner_id', learnerId)
      .order('assessment_date', { ascending: false })
      .limit(3);

    (assessments || []).forEach((a: any) => {
      const pct = Number(a.percentage || 0);
      notifications.push({
        type: 'assessment', icon: '📝',
        color: pct >= 70 ? '#2DD4A0' : pct >= 50 ? '#FCD34D' : '#F87171',
        title: `Assessment result: ${a.subject}`,
        body:  `You scored ${pct}% — ${a.grade_band || 'result recorded'}`,
        time:  a.assessment_date,
      });
    });

    // Recent interventions
    const { data: interventions } = await supabase
      .from('interventions')
      .select('reason, status, created_at')
      .eq('learner_id', learnerId)
      .order('created_at', { ascending: false })
      .limit(2);

    (interventions || []).forEach((i: any) => {
      notifications.push({
        type: 'intervention', icon: '⚠️',
        color: '#F87171',
        title: 'Support flag raised',
        body:  `Your teacher has flagged a support need. Status: ${i.status}`,
        time:  i.created_at?.slice(0, 10),
      });
    });

    // Recent mentorship
    const { data: sessions } = await supabase
      .from('mentorship_sessions')
      .select('session_date, next_steps')
      .eq('learner_id', learnerId)
      .order('session_date', { ascending: false })
      .limit(2);

    (sessions || []).forEach((s: any) => {
      notifications.push({
        type: 'mentorship', icon: '💬',
        color: '#818CF8',
        title: 'Mentorship session logged',
        body:  s.next_steps ? `Next steps: ${s.next_steps}` : 'Session recorded by your mentor',
        time:  s.session_date,
      });
    });
  }

  // Sort by time desc
  notifications.sort((a, b) => (b.time || '').localeCompare(a.time || ''));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <p className="text-white/50 text-sm mt-0.5">{notifications.length} recent updates</p>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No notifications yet.</p>
          <p className="text-white/30 text-sm mt-1">Updates will appear here when your teacher records marks or sessions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n, i) => (
            <div key={i}
              className="rounded-2xl p-4 bg-white/5 border border-white/10 flex items-start gap-3">
              <div className="text-2xl shrink-0">{n.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{n.title}</p>
                <p className="text-xs text-white/50 mt-0.5">{n.body}</p>
                {n.time && (
                  <p className="text-xs text-white/30 mt-1">{fmt.date(n.time)}</p>
                )}
              </div>
              <div className="w-2 h-2 rounded-full mt-1 shrink-0"
                style={{ background: n.color }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
