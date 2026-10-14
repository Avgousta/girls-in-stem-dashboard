export const dynamic = 'force-dynamic';

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
  school_id:    z.string().uuid().optional(), // instructors only
});

export async function POST(req: NextRequest) {
  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const d      = parsed.data;
  const supabase = createAdminClient();

  // Learners register through /api/v1/auth/register-learner, which creates the
  // account server-side after checking the learner code and name.
  if (d.role === 'learner') return err('Please refresh the page and try again', 410);

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