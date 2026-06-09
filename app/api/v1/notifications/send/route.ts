export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err } from '@/app/api/helpers';
import { auditLog } from '@/lib/audit';

const schema = z.object({
  title:      z.string().min(1).max(120),
  body:       z.string().min(1).max(500),
  type:       z.enum(['absence','low_score','intervention','risk','mentorship','project_feedback','assessment','meeting','general']).default('general'),
  // Target: send to specific users OR all learners in a programme OR all users with a role
  user_ids:   z.array(z.string().uuid()).optional(),
  program_id: z.string().uuid().optional(),
  role:       z.enum(['learner','instructor','admin','parent','sponsor']).optional(),
});

export async function POST(req: NextRequest) {
  const { supabase, profile, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { title, body: bodyText, type, user_ids, program_id, role } = parsed.data;

  let targetUserIds: string[] = [];

  if (user_ids?.length) {
    // Explicit list of user IDs
    targetUserIds = user_ids;
  } else if (program_id) {
    // All learners enrolled in a programme → find their user_ids
    const { data: enrollments } = await supabase
      .from('program_enrollments')
      .select('learners(user_id)')
      .eq('program_id', program_id)
      .eq('status', 'active');
    targetUserIds = ((enrollments || []) as unknown as Array<{ learners: { user_id: string } | null }>)
      .map(e => e.learners?.user_id)
      .filter((id): id is string => !!id);
  } else if (role) {
    // All users with a specific role
    const { data: users } = await supabase
      .from('users')
      .select('user_id')
      .eq('role', role)
      .eq('is_active', true);
    targetUserIds = (users || []).map((u: { user_id: string }) => u.user_id);
  } else {
    return err('Provide user_ids, program_id, or role as target');
  }

  if (!targetUserIds.length) return err('No recipients found for the given target');

  // Insert one notification per recipient
  const records = targetUserIds.map(uid => ({
    user_id:  uid,
    type,
    title,
    body:     bodyText,
    is_read:  false,
  }));

  const { data, error } = await supabase
    .from('notifications')
    .insert(records)
    .select();

  if (error) return err(error.message, 500);

  await auditLog({
    actor_id: profile?.user_id, actor_email: profile?.email, actor_role: profile?.role,
    action: 'notification.send',
    entity_type: 'notification',
    entity_label: `"${title}" → ${targetUserIds.length} recipient(s)`,
  });

  return ok({ sent: data?.length ?? 0, recipients: targetUserIds.length });
}
