import { NextRequest } from 'next/server';
import { z } from 'zod';
import { err, created } from '@/app/api/helpers';
import { createAdminClient } from '@/lib/supabase/server';

const schema = z.object({
  user_id:      z.string().uuid(),
  email:        z.string().email(),
  full_name:    z.string().min(1),
  role:         z.enum(['learner', 'instructor']),
  phone:        z.string().optional(),
  learner_code: z.string().optional(), // learners only
  school_id:    z.string().uuid().optional(), // instructors only
});

export async function POST(req: NextRequest) {
  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const d      = parsed.data;
  const supabase = createAdminClient();

  if (d.role === 'learner') {
    // Find learner by code and link to this user
    if (!d.learner_code) return err('Learner code is required');

    const { data: learner } = await supabase
      .from('learners')
      .select('learner_id, user_id')
      .eq('learner_code', d.learner_code)
      .single();

    if (!learner) return err('Learner code not found — check with your teacher');
    if (learner.user_id) return err('This learner code is already linked to an account');

    // Create user profile
    const { error: userErr } = await supabase.from('users').insert({
      user_id:   d.user_id,
      email:     d.email,
      full_name: d.full_name,
      role:      'learner',
      phone:     d.phone || null,
      is_active: true,
    });
    if (userErr) return err(userErr.message, 500);

    // Link learner to user
    const { error: linkErr } = await supabase
      .from('learners')
      .update({ user_id: d.user_id })
      .eq('learner_id', learner.learner_id);
    if (linkErr) return err(linkErr.message, 500);

    return created({ role: 'learner', learner_id: learner.learner_id });
  }

  if (d.role === 'instructor') {
    // Create user profile — pending approval
    const { error: userErr } = await supabase.from('users').insert({
      user_id:   d.user_id,
      email:     d.email,
      full_name: d.full_name,
      role:      'instructor',
      school_id: d.school_id || null,
      phone:     d.phone || null,
      is_active: false, // pending admin approval
    });
    if (userErr) return err(userErr.message, 500);

    return created({ role: 'instructor', pending: true });
  }

  return err('Invalid role');
}
