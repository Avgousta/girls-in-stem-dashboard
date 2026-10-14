export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err } from '@/app/api/helpers';
import { leadUpdateSchema } from '@/lib/connect';

interface Params { params: Promise<{ id: string }> }

// Internal workflow fields only — visitor-submitted details stay as received
export async function PATCH(req: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin']);
  if (denied) return denied;

  const parsed = leadUpdateSchema.safeParse(await req.json());
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { data, error } = await supabase
    .from('conference_leads')
    .update(parsed.data)
    .eq('lead_id', (await params).id)
    .select()
    .single();

  if (error) return err(error.message, 500);
  return ok(data);
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin']);
  if (denied) return denied;

  const { error } = await supabase
    .from('conference_leads')
    .delete()
    .eq('lead_id', (await params).id);

  if (error) return err(error.message, 500);
  return ok({ deleted: true });
}
