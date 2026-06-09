import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import NotificationsClient from './NotificationsClient';
import { DS } from '@/components/platform/tokens';
import { Bell } from 'lucide-react';

export default async function NotificationsPage() {
  const user     = await requireAuth();
  const supabase = await createClient();

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.user_id)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: DS.text }}>
          <Bell className="w-6 h-6" style={{ color: DS.primary }} /> Notifications
        </h1>
        <p className="text-sm mt-0.5" style={{ color: DS.textMuted }}>Alerts and updates for your learners</p>
      </div>
      <NotificationsClient notifications={data || []} />
    </div>
  );
}
