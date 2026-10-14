export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err } from '@/app/api/helpers';
import { createAdminClient } from '@/lib/supabase/server';

interface Params { params: Promise<{ id: string }> }

export async function POST(_: NextRequest, { params }: Params) {
  const { denied } = await requireApiAuth(['admin']);
  if (denied) return denied;

  const { id } = await params;
  // users RLS only lets people update their own row, so use the service client
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('users')
    .update({ is_active: true })
    .eq('user_id', id)
    .select('user_id');
  if (error) return err(error.message, 500);
  if (!data?.length) return err('User not found', 404);

  // Approval vouches for the account, so mark the email verified: the
  // verification email may never have arrived (Supabase email rate limit)
  const { error: authErr } = await admin.auth.admin.updateUserById(id, { email_confirm: true });
  if (authErr) return err(authErr.message, 500);

  return ok({ approved: true });
}
