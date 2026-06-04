export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created, getPagination, paginatedResponse } from '@/app/api/helpers';

const createSchema = z.object({
  learner_id:       z.string().uuid(),
  mentor_id:        z.string().uuid(),
  session_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  session_type:     z.enum(['check_in','goal_review','academic_support','career','pastoral','other']).default('check_in'),
  duration_minutes: z.number().int().min(1).optional(),
  notes:            z.string().optional(),
  next_steps:       z.string().optional(),
  goals_discussed:  z.string().optional(),
  learner_mood:     z.number().int().min(1).max(5).optional(),
  outcome:          z.enum(['positive','neutral','needs_follow_up']).optional(),
  intervention_id:  z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin','instructor','learner']);
  if (denied) return denied;
  const sp = req.nextUrl.searchParams;
  const { from, to, page, limit } = getPagination(sp);
  const learnerId = sp.get('learner_id');
  const mentorId  = sp.get('mentor_id');
  let q = supabase.from('mentorship_sessions')
    .select(`session_id, session_date, session_type, duration_minutes, notes, next_steps, outcome, learner_mood, created_at,
      learners!inner(learner_profiles(first_name,last_name)),
      users!mentor_id(full_name)`, { count:'exact' })
    .range(from, to).order('session_date', { ascending:false });
  if (learnerId) q = q.eq('learner_id', learnerId);
  if (mentorId)  q = q.eq('mentor_id',  mentorId);
  const { data, count, error } = await q;
  if (error) return err(error.message, 500);
  return paginatedResponse(data || [], count || 0, page, limit);
}

export async function POST(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin','instructor']);
  if (denied) return denied;
  const body   = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { data: session, error } = await supabase
    .from('mentorship_sessions').insert(parsed.data).select().single();
  if (error) return err(error.message, 500);

  // Auto-create a follow-up goal when outcome requires it (non-blocking)
  if (parsed.data.outcome === 'needs_follow_up') {
    const targetDate = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    supabase.from('mentorship_goals').insert({
      learner_id:  parsed.data.learner_id,
      mentor_id:   parsed.data.mentor_id,
      title:       `Follow-up after ${parsed.data.session_type.replace(/_/g, ' ')} session`,
      description: parsed.data.next_steps
        ? `Next steps noted: ${parsed.data.next_steps}`
        : 'Follow up from session marked as needing attention.',
      target_date: targetDate,
      status:      'active',
      progress:    0,
    }).then(({ error: gErr }) => {
      if (gErr) console.error('[auto-goal] insert failed:', gErr.message);
    });
  }

  return created(session);
}