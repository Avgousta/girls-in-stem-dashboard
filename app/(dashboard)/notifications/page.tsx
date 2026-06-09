import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import NotificationsClient from './NotificationsClient';
import SendNotificationForm from './SendNotificationForm';
import { DS } from '@/components/platform/tokens';
import { Bell } from 'lucide-react';

export default async function NotificationsPage() {
  const user     = await requireAuth();
  const supabase = await createClient();

  const [notifRes, programRes] = await Promise.all([
    supabase.from('notifications').select('*')
      .eq('user_id', user.user_id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('programs').select('program_id, program_name')
      .eq('is_active', true).order('program_name'),
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

      <NotificationsClient notifications={notifRes.data || []} />
    </div>
  );
}
