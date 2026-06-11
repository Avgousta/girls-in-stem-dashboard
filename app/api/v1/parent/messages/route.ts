export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created } from '@/app/api/helpers';
import { createNotification } from '@/lib/notifications';

const sendSchema = z.object({
  learner_id:   z.string().uuid(),
  message_type: z.enum(['general', 'excuse', 'concern']).default('general'),
  subject:      z.string().min(2).max(200),
  body:         z.string().min(2).max(2000),
  absence_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { supabase, profile, denied } = await requireApiAuth(['parent', 'admin', 'instructor']);
  if (denied) return denied;

  let q = supabase
    .from('parent_messages')
    .select(`
      message_id, message_type, subject, body, absence_date,
      status, reply_body, replied_at, created_at,
      learners!inner(
        learner_profiles(first_name, last_name),
        schools(school_name)
      ),
      parent:users!parent_id(full_name),
      replier:users!replied_by(full_name)
    `)
    .order('created_at', { ascending: false });

  if (profile?.role === 'parent') {
    q = q.eq('parent_id', profile.user_id);
  }

  const learnerId = req.nextUrl.searchParams.get('learner_id');
  if (learnerId) q = q.eq('learner_id', learnerId);

  const { data, error } = await q;
  if (error) return err(error.message, 500);
  return ok(data);
}

export async function POST(req: NextRequest) {
  const { supabase, profile, denied } = await requireApiAuth(['parent']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { data, error } = await supabase
    .from('parent_messages')
    .insert({ ...parsed.data, parent_id: profile!.user_id })
    .select()
    .single();

  if (error) return err(error.message, 500);

  // Notify all admins
  const { data: admins } = await supabase
    .from('users').select('user_id').eq('role', 'admin');

  await Promise.all((admins || []).map(a =>
    createNotification({
      user_id: a.user_id,
      type:    'parent_message',
      title:   `Parent message — ${parsed.data.subject}`,
      body:    `${parsed.data.message_type === 'excuse' ? '📋 Absence excuse' : parsed.data.message_type === 'concern' ? '⚠️ Concern' : '💬 Message'}: ${parsed.data.body.slice(0, 100)}`,
    })
  ));

  return created(data);
}
