import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import NotificationsClient from './NotificationsClient';
import SendNotificationForm from './SendNotificationForm';
import ParentInbox from './ParentInbox';
import { DS } from '@/components/platform/tokens';
import { Bell } from 'lucide-react';

export default async function NotificationsPage() {
  const user     = await requireAuth();
  const supabase = await createClient();

  const [notifRes, programRes, parentMsgRes] = await Promise.all([
    supabase.from('notifications').select('*')
      .eq('user_id', user.user_id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('programs').select('program_id, program_name')
      .eq('is_active', true).order('program_name'),
    (user.role === 'admin' || user.role === 'instructor')
      ? supabase.from('parent_messages').select(`
          message_id, message_type, subject, body, absence_date,
          status, reply_body, replied_at, created_at,
          learners!inner(learner_profiles(first_name, last_name)),
          parent:users!parent_id(full_name, email)
        `).order('created_at', { ascending: false }).limit(50)
      : Promise.resolve({ data: [] }),
  ]);

  const isAdmin = user.role === 'admin' || user.role === 'instructor';

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: DS.text }}>
          <Bell className="w-6 h-6" style={{ color: DS.primary }} /> Notifications
        </h1>
        <p className="text-sm mt-0.5" style={{ color: DS.textMuted }}>Alerts and updates for your learners</p>
      </div>

      {/* Send notification panel — admin/instructor only */}
      {isAdmin && (
        <SendNotificationForm programs={programRes.data || []} />
      )}

      {/* Parent messages inbox — admin/instructor only */}
      {isAdmin && (parentMsgRes as { data: unknown[] | null }).data?.length ? (
        <ParentInbox messages={(parentMsgRes as { data: unknown[] }).data} />
      ) : null}

      <NotificationsClient notifications={notifRes.data || []} />
    </div>
  );
}
