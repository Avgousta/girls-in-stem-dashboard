import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import TeacherMeetingsClient from './TeacherMeetingsClient';
import { Video } from 'lucide-react';
import { DS } from '@/components/platform/tokens';

export default async function TeacherMeetingsPage() {
  const user     = await requireAuth(['instructor', 'admin']);
  const supabase = await createClient();

  const [meetingsRes, programsRes] = await Promise.all([
    supabase
      .from('online_meetings')
      .select(`
        meeting_id, title, description, meeting_url, platform,
        scheduled_at, duration_min, is_cancelled, created_at,
        programs(program_name, program_type)
      `)
      .eq('instructor_id', user.user_id)
      .eq('is_cancelled', false)
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('programs')
      .select('program_id, program_name, program_type')
      .eq('instructor_id', user.user_id)
      .eq('is_active', true)
      .order('program_name'),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: DS.text }}>
          <Video className="w-6 h-6" style={{ color: DS.primary }} /> Online Meetings
        </h1>
        <p className="text-sm mt-0.5" style={{ color: DS.textMuted }}>
          Schedule virtual classes — learners will be notified and can join from their portal
        </p>
      </div>
      <TeacherMeetingsClient
        meetings={((meetingsRes.data || []) as any[]).map((m: any) => ({
          ...m,
          programs: Array.isArray(m.programs) ? m.programs[0] ?? null : m.programs ?? null,
        }))}
        programs={programsRes.data || []}
        instructorId={user.user_id}
      />
    </div>
  );
}
