export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err } from '@/app/api/helpers';
import { createNotification } from '@/lib/notifications';

const replySchema = z.object({ reply_body: z.string().min(2).max(2000) });

interface Params { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { supabase, profile, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const messageId = (await params).id;

  const { data, error } = await supabase
    .from('parent_messages')
    .update({
      reply_body:  parsed.data.reply_body,
      replied_by:  profile!.user_id,
      replied_at:  new Date().toISOString(),
      status:      'replied',
    })
    .eq('message_id', messageId)
    .select('parent_id, subject')
    .single();

  if (error) return err(error.message, 500);

  const msg = data as { parent_id: string; subject: string };

  // Notify the parent
  await createNotification({
    user_id: msg.parent_id,
    type:    'parent_message_reply',
    title:   `Reply to your message — ${msg.subject}`,
    body:    parsed.data.reply_body.slice(0, 120),
  });

  return ok(data);
}
