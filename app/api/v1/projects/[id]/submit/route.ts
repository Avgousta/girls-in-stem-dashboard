export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err } from '@/app/api/helpers';

interface Params { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { supabase, profile, denied } = await requireApiAuth(['learner']);
  if (denied) return denied;

  const { id }      = await params;
  const { file_url, notes } = await req.json();

  // Verify this project belongs to this learner
  const { data: project } = await supabase
    .from('projects')
    .select('project_id, learner_id, learners!inner(user_id)')
    .eq('project_id', id)
    .single();

  if (!project) return err('Project not found', 404);
  if ((project as any).learners?.user_id !== profile!.user_id) return err('Not your project', 403);

  const { data, error } = await supabase
    .from('projects')
    .update({
      file_url:          file_url || null,
      stage:             'submitted',
      completion_status: 'in_progress',
      submitted_at:      new Date().toISOString(),
    })
    .eq('project_id', id)
    .select()
    .single();

  if (error) return err(error.message, 500);
  return ok(data);
}