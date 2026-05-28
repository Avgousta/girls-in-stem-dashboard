import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import MeetingsClient from './MeetingsClient';

export default async function StudentMeetingsPage() {
  const user     = await requireAuth(['learner']);
  const supabase = await createClient();

  const { data: learner } = await supabase
    .from('learners')
    .select('learner_id, program_enrollments(program_id)')
    .eq('user_id', user.user_id)
    .single();

  const programIds = ((learner as any)?.program_enrollments || []).map((e: any) => e.program_id);
  const learnerId  = (learner as any)?.learner_id;

  // Fetch meetings for their programmes (upcoming + recent past)
  const { data: meetings } = programIds.length
    ? await supabase
        .from('online_meetings')
        .select(`
          meeting_id, title, description, meeting_url, platform,
          scheduled_at, duration_min, created_at,
          users!instructor_id(full_name),
          programs(program_name, program_type),
          meeting_ratings(rating, comment, learner_id)
        `)
        .eq('is_cancelled', false)
        .in('program_id', programIds)
        .gte('scheduled_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(30)
    : { data: [] };

  return (
    <div className="space-y-4 pt-2">
      <div>
        <h1 className="text-2xl font-black text-white">Online Classes 🎥</h1>
        <p className="text-white/40 text-sm mt-0.5">Join live · Rate your experience</p>
      </div>
      <MeetingsClient
        meetings={(meetings || []).map((m: any) => ({
          ...m,
          myRating: m.meeting_ratings?.find((r: any) => r.learner_id === learnerId) || null,
        }))}
        learnerId={learnerId}
      />
    </div>
  );
}
