import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err } from '@/app/api/helpers';
interface Params { params: Promise<{ id: string }> }

const VALID_STAGES = ['planning','in_progress','review','submitted','marked'];

export async function PATCH(req: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin','instructor']);
  if (denied) return denied;
  const { id } = await params;
  const { stage } = await req.json();
  if (!VALID_STAGES.includes(stage)) return err('Invalid stage');
  const completion_status = stage === 'marked' ? 'completed' : stage === 'planning' ? 'not_started' : 'in_progress';
  const { data, error } = await supabase
    .from('projects')
    .update({ stage, completion_status })
    .eq('project_id', id)
    .select().single();
  if (error) return err(error.message, 500);
  return ok(data);
}
