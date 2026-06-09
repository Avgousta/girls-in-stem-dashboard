export const dynamic = 'force-dynamic';
import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import StudentThemeProvider from './StudentThemeProvider';
import StudentShell from './StudentShell';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user     = await requireAuth(['learner']);
  const supabase = await createClient();

  const { data: learner } = await supabase
    .from('learners')
    .select('learner_id, learner_profiles(first_name, avatar_url, cover_color)')
    .eq('user_id', user.user_id)
    .single();

  const profile    = (learner as unknown as { learner_profiles: { first_name: string; avatar_url: string | null; cover_color: string | null } | null } | null)?.learner_profiles;
  const firstName  = profile?.first_name  || user.full_name.split(' ')[0];
  const avatarUrl  = profile?.avatar_url  || null;
  const accentColor = profile?.cover_color || '#4F2D7F';

  const { count: unread } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.user_id)
    .eq('is_read', false);

  return (
    <StudentThemeProvider defaultAccent={accentColor}>
      <StudentShell
        firstName={firstName}
        avatarUrl={avatarUrl}
        unread={unread || 0}>
        {children}
      </StudentShell>
    </StudentThemeProvider>
  );
}
