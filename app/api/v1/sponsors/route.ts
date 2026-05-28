import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created } from '@/app/api/helpers';

const createSchema = z.object({
  sponsor_name:  z.string().min(1),
  contact_name:  z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  website:       z.string().optional(),
});

export async function GET() {
  const { supabase, denied } = await requireApiAuth(['admin']);
  if (denied) return denied;
  const { data, error } = await supabase.from('sponsors').select('*, sponsor_learners(count)').order('sponsor_name');
  if (error) return err(error.message, 500);
  return ok(data);
}

export async function POST(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin']);
  if (denied) return denied;
  const body   = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);
  const ins: any = { sponsor_name: parsed.data.sponsor_name };
  if (parsed.data.contact_name)  ins.contact_name  = parsed.data.contact_name;
  if (parsed.data.contact_email) ins.contact_email = parsed.data.contact_email;
  const { data, error } = await supabase.from('sponsors').insert(ins).select().single();
  if (error) return err(error.message, 500);
  return created(data);
}
