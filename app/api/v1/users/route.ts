export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created } from '@/app/api/helpers';
import { createAdminClient } from '@/lib/supabase/server';

const createUserSchema = z.object({
  full_name: z.string().min(2),
  email:     z.string().email(),
  password:  z.string().min(8),
  role:      z.enum(['admin', 'instructor', 'learner', 'sponsor', 'parent']),
  school_id: z.string().uuid().optional(),
  phone:     z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { denied } = await requireApiAuth(['admin']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const admin = createAdminClient();

  // Create auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email:             parsed.data.email,
    password:          parsed.data.password,
    email_confirm:     true,
  });

  if (authError) return err(authError.message, 500);

  // Insert into users table
  const { data: user, error: dbError } = await admin.from('users').insert({
    user_id:   authData.user.id,
    email:     parsed.data.email,
    full_name: parsed.data.full_name,
    role:      parsed.data.role,
    school_id: parsed.data.school_id ?? null,
    phone:     parsed.data.phone ?? null,
    is_active: true,
  }).select().single();

  if (dbError) {
    // Roll back the auth user if DB insert fails
    await admin.auth.admin.deleteUser(authData.user.id);
    return err(dbError.message, 500);
  }

  return created(user);
}
