import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err, created } from '@/app/api/helpers';
interface Params { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { supabase, profile, denied } = await requireApiAuth(['admin','instructor']);
  if (denied) return denied;
  const { id } = await params;
  const { note, status_change } = await req.json();
  if (!note?.trim()) return err('note required');
  const { data, error } = await supabase
    .from('intervention_updates')
    .insert({ intervention_id: id, author_id: profile!.user_id, note: note.trim(), status_change: status_change || null })
    .select().single();
  if (error) return err(error.message, 500);
  return created(data);
}
