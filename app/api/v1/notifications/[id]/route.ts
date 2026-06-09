export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err } from '@/app/api/helpers';

interface Params { params: Promise<{ id: string }> }

// Mark a single notification as read or unread
export async function PATCH(req: NextRequest, { params }: Params) {
  const { supabase, profile, denied } = await requireApiAuth();
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const is_read = body.is_read ?? true;

  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read })
    .eq('notification_id', id)
    .eq('user_id', profile!.user_id) // ensure ownership
    .select()
    .single();

  if (error) return err(error.message, 500);
  return ok(data);
}

// Delete a single notification
export async function DELETE(_: NextRequest, { params }: Params) {
  const { supabase, profile, denied } = await requireApiAuth();
  if (denied) return denied;

  const { id } = await params;

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('notification_id', id)
    .eq('user_id', profile!.user_id); // ensure ownership

  if (error) return err(error.message, 500);
  return ok({ deleted: id });
}
