export const dynamic = 'force-dynamic';
import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import PlatformShell from '@/components/platform/PlatformShell';

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user     = await requireAuth(['instructor']);
  const supabase = await createClient();

  const { count: unread } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.user_id)
    .eq('is_read', false);

  const { count: openInterv } = await supabase
    .from('interventions')
    .select('*', { count: 'exact', head: true })
    .eq('flagged_by', user.user_id)
    .eq('status', 'open');

  return (
    <PlatformShell
      role="instructor"
      userName={user.full_name}
      unreadNotifications={unread || 0}
      openInterventions={openInterv || 0}>
      {children}
    </PlatformShell>
  );
}
