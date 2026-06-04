export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created } from '@/app/api/helpers';

const createSchema = z.object({
  program_id:   z.string().uuid().optional(),
  title:        z.string().min(1),
  description:  z.string().optional(),
  meeting_url:  z.string().url('Enter a valid meeting URL'),
  platform:     z.enum(['zoom','meet','teams','other']).default('other'),
  scheduled_at: z.string().min(1, 'Schedule a date and time'),
  duration_min: z.number().min(15).max(480).default(60),
});

export async function GET(req: NextRequest) {
  const { supabase, profile, denied } = await requireApiAuth(['admin','instructor','learner','sponsor']);
  if (denied) return denied;

  const sp         = req.nextUrl.searchParams;
  const programId  = sp.get('program_id');
  const upcoming   = sp.get('upcoming') === 'true';

  let query = supabase
    .from('online_meetings')
    .select(`
      meeting_id, title, description, meeting_url, platform,
      scheduled_at, duration_min, is_cancelled, created_at,
      users!instructor_id(full_name),
      programs(program_name, program_type)
    `)
    .eq('is_cancelled', false)
    .order('scheduled_at', { ascending: true });

  if (upcoming) query = query.gte('scheduled_at', new Date().toISOString());
  if (programId) query = query.eq('program_id', programId);

  // Instructors only see their own meetings
  if (profile!.role === 'instructor') query = query.eq('instructor_id', profile!.user_id);

  const { data, error } = await query.limit(50);
  if (error) return err(error.message, 500);
  return ok(data || []);
}

export async function POST(req: NextRequest) {
  const { supabase, profile, denied } = await requireApiAuth(['admin','instructor']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { data, error } = await supabase
    .from('online_meetings')
    .insert({ ...parsed.data, instructor_id: profile!.user_id })
    .select()
    .single();

  if (error) return err(error.message, 500);

  // Notify learners in the programme
  if (parsed.data.program_id) {
    const { data: enrollments } = await supabase
      .from('program_enrollments')
      .select('learners(user_id, learner_profiles(first_name))')
      .eq('program_id', parsed.data.program_id)
      .eq('status', 'active');

    const dt = new Date(parsed.data.scheduled_at).toLocaleString('en-ZA', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit',
    });

    for (const e of (enrollments || [])) {
      const learner = (e as any).learners;
      if (learner?.user_id) {
        try {
          await supabase.from('notifications').insert({
            user_id:    learner.user_id,
            type:       'meeting',
            title:      `📅 Online class scheduled`,
            body:       `${parsed.data.title} — ${dt}. Check your Student Portal to join.`,
          });
        } catch (_) {}
      }
    }
  }

  return created(data);
}