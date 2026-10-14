export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err } from '@/app/api/helpers';
import { createAdminClient } from '@/lib/supabase/server';

interface Params { params: Promise<{ id: string }> }

export async function POST(_: NextRequest, { params }: Params) {
  const { denied } = await requireApiAuth(['admin']);
  if (denied) return denied;

  const { id } = await params;
  const admin = createAdminClient();

  const { data: user } = await admin.from('users').select('role, is_active').eq('user_id', id).single();
  if (!user) return err('User not found', 404);

  // Active account ("Deactivate"): switch it off but keep it, so it can be re-approved
  if (user.is_active) {
    const { error } = await admin.from('users').update({ is_active: false }).eq('user_id', id);
    if (error) return err(error.message, 500);
    return ok({ deactivated: true });
  }

  // Pending sign-up ("Reject"): remove the profile and the login, so the
  // person can register again with the same email if needed
  const { error } = await admin.from('users').delete().eq('user_id', id);
  if (error) return err(error.message, 500);
  const { error: authErr } = await admin.auth.admin.deleteUser(id);
  if (authErr) return err(authErr.message, 500);
  return ok({ rejected: true });
}
