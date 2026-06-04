export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err, created } from '@/app/api/helpers';
import { createAdminClient } from '@/lib/supabase/server';
interface Params { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { denied } = await requireApiAuth(['admin']);
  if (denied) return denied;
  const { id } = await params;
  const { email, full_name, password } = await req.json();
  if (!email || !full_name || !password) return err('email, full_name and password required');

  const admin = createAdminClient();

  // Create auth user
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name, role: 'sponsor' },
  });
  if (authErr) return err(authErr.message, 500);

  // Create users row
  const { data, error } = await admin.from('users').insert({
    user_id:    authData.user.id,
    email,
    full_name,
    role:       'sponsor',
    sponsor_id: id,
    is_active:  true,
  }).select().single();

  if (error) return err(error.message, 500);
  return created(data);
}