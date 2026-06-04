export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err } from '@/app/api/helpers';

export async function GET(req: NextRequest) {
  const { supabase, profile, denied } = await requireApiAuth();
  if (denied) return denied;

  const unreadOnly = req.nextUrl.searchParams.get('unread') === 'true';

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', profile!.user_id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (unreadOnly) query = query.eq('is_read', false);

  const { data, error } = await query;
  if (error) return err(error.message, 500);
  return ok(data || []);
}

export async function PATCH(req: NextRequest) {
  const { supabase, profile, denied } = await requireApiAuth();
  if (denied) return denied;

  // Mark all as read
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', profile!.user_id)
    .eq('is_read', false);

  if (error) return err(error.message, 500);
  return ok({ marked_read: true });
}