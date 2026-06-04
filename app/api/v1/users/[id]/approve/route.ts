export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err } from '@/app/api/helpers';

interface Params { params: Promise<{ id: string }> }

export async function POST(_: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin']);
  if (denied) return denied;

  const { id } = await params;
  const { error } = await supabase
    .from('users')
    .update({ is_active: true })
    .eq('user_id', id);

  if (error) return err(error.message, 500);
  return ok({ approved: true });
}