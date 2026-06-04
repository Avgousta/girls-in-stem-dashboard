export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err } from '@/app/api/helpers';
interface Params { params: Promise<{ id: string }> }
export async function PATCH(req: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin','instructor']);
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json();
  const { data, error } = await supabase.from('mentorship_goals').update(body).eq('goal_id', id).select().single();
  if (error) return err(error.message, 500);
  return ok(data);
}