export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requireApiAuth, ok, err, created } from '@/app/api/helpers';
interface Params { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin','instructor']);
  if (denied) return denied;
  const { id } = await params;
  const { data, error } = await supabase
    .from('project_feedback')
    .select('*, users!author_id(full_name, role)')
    .eq('project_id', id)
    .order('created_at');
  if (error) return err(error.message, 500);
  return ok(data);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { supabase, profile, denied } = await requireApiAuth(['admin','instructor']);
  if (denied) return denied;
  const { id } = await params;
  const { body, is_private } = await req.json();
  if (!body?.trim()) return err('body is required');
  const { data, error } = await supabase
    .from('project_feedback')
    .insert({ project_id: id, author_id: profile!.user_id, body: body.trim(), is_private: !!is_private })
    .select().single();
  if (error) return err(error.message, 500);

  // Notify the learner if feedback is public
  if (!is_private) {
    const { data: proj } = await supabase
      .from('projects')
      .select('project_name, learner_id, learners(user_id)')
      .eq('project_id', id)
      .single();

    const learnerUserId = (proj as any)?.learners?.user_id;
    if (learnerUserId) {
      try {
        await supabase.from('notifications').insert({
          user_id:    learnerUserId,
          learner_id: (proj as any)?.learner_id,
          type:       'project_feedback',
          title:      `New feedback on your project`,
          body:       `Your instructor left feedback on "${(proj as any)?.project_name}".`,
        });
      } catch (_) {}
    }
  }

  return created(data);
}