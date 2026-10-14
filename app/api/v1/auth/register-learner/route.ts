export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { err, created } from '@/app/api/helpers';
import { createAdminClient } from '@/lib/supabase/server';
import { learnerNameMatches } from '@/utils';

// Learner self-registration with a teacher-issued learner code.
// The account is created server-side and marked as confirmed, so no
// verification email is sent: Supabase's email rate limit can't block a class
// registering together. The learner code + name check is the identity check.
const schema = z.object({
  learner_code: z.string().min(1),
  full_name:    z.string().trim().min(1, 'Enter your full name'),
  email:        z.string().trim().email('Enter a valid email address'),
  password:     z.string().min(8, 'Password must be at least 8 characters'),
  phone:        z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const d        = parsed.data;
  const code     = d.learner_code.trim().toUpperCase();
  const email    = d.email.toLowerCase();
  const supabase = createAdminClient();

  const { data: learner } = await supabase
    .from('learners')
    .select('learner_id, user_id, learner_profiles(first_name, last_name)')
    .eq('learner_code', code)
    .single();

  if (!learner) return err('Learner code not found — check with your teacher', 404);
  if (learner.user_id) return err('This learner code already has an account. Please sign in instead.', 409);

  const p = (learner as unknown as { learner_profiles: { first_name: string | null; last_name: string | null } | null }).learner_profiles;
  if (!learnerNameMatches(d.full_name, p?.first_name ?? null, p?.last_name ?? null)) {
    return err('This learner code belongs to a different learner. Check the code with your teacher, or use the name your teacher has on record.', 409);
  }

  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password:      d.password,
    email_confirm: true,
    user_metadata: { full_name: d.full_name, role: 'learner' },
  });
  if (authErr || !authData.user) {
    if (/already|registered|exists/i.test(authErr?.message ?? '')) {
      return err('An account with this email already exists. Sign in instead, or use a different email address.', 409);
    }
    return err(authErr?.message || 'Could not create your account — please try again', 500);
  }
  const userId = authData.user.id;

  // Undo the auth account if any later step fails, so the learner can retry.
  const rollback = async (message: string, status = 500) => {
    await supabase.from('users').delete().eq('user_id', userId);
    await supabase.auth.admin.deleteUser(userId);
    return err(message, status);
  };

  const { error: userErr } = await supabase.from('users').insert({
    user_id:   userId,
    email,
    full_name: d.full_name,
    role:      'learner',
    phone:     d.phone || null,
    is_active: true,
  });
  if (userErr) return rollback(userErr.message);

  // Only link if the code is still free (guards against two people registering it at once)
  const { data: linked, error: linkErr } = await supabase
    .from('learners')
    .update({ user_id: userId })
    .eq('learner_id', learner.learner_id)
    .is('user_id', null)
    .select('learner_id');
  if (linkErr) return rollback(linkErr.message);
  if (!linked?.length) return rollback('This learner code already has an account. Please sign in instead.', 409);

  return created({ role: 'learner', learner_id: learner.learner_id });
}
