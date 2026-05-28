import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err } from '@/app/api/helpers';
import { createAdminClient } from '@/lib/supabase/server';

const inviteSchema = z.object({
  email:     z.string().email(),
  full_name: z.string().min(1),
  role:      z.enum(['admin', 'instructor', 'learner', 'parent']),
  school_id: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const { denied } = await requireApiAuth(['admin']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const adminClient = createAdminClient();

  // Create Supabase Auth user (sends invite email)
  const { data: authUser, error: authError } = await adminClient.auth.admin.inviteUserByEmail(
    parsed.data.email,
    { data: { full_name: parsed.data.full_name, role: parsed.data.role } }
  );

  if (authError) return err(authError.message, 500);

  // Create users record
  const { data, error } = await adminClient
    .from('users')
    .insert({
      user_id:   authUser.user.id,
      email:     parsed.data.email,
      full_name: parsed.data.full_name,
      role:      parsed.data.role,
      school_id: parsed.data.school_id || null,
    })
    .select()
    .single();

  if (error) return err(error.message, 500);

  return ok({ invited: true, user: data });
}
