import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err } from '@/app/api/helpers';

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin','instructor']);
  if (denied) return denied;
  const { id }  = await params;
  const body    = await req.json();
  const { data, error } = await supabase
    .from('online_meetings').update(body).eq('meeting_id', id).select().single();
  if (error) return err(error.message, 500);
  return ok(data);
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin','instructor']);
  if (denied) return denied;
  const { id } = await params;
  const { error } = await supabase
    .from('online_meetings').update({ is_cancelled: true }).eq('meeting_id', id);
  if (error) return err(error.message, 500);
  return ok({ cancelled: true });
}
