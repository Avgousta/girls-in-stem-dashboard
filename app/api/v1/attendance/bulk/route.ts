import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err } from '@/app/api/helpers';

const bulkSchema = z.object({
  program_id:   z.string().uuid(),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  captured_by:  z.string().uuid(),
  records: z.array(z.object({
    learner_id: z.string().uuid(),
    status:     z.enum(['present', 'absent', 'late', 'excused']),
    notes:      z.string().optional(),
  })).min(1, 'At least one record required'),
});

export async function POST(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { program_id, session_date, captured_by, records } = parsed.data;

  const rows = records.map(r => ({
    learner_id:  r.learner_id,
    program_id,
    session_date,
    captured_by,
    status: r.status,
    notes:  r.notes || null,
  }));

  // Upsert — handles duplicate sessions gracefully
  const { data, error } = await supabase
    .from('attendance')
    .upsert(rows, { onConflict: 'learner_id,program_id,session_date' })
    .select();

  if (error) return err(error.message, 500);

  // Trigger risk recalculation
  try { await supabase.rpc('calculate_risk_scores'); } catch (_) {}

  // Notify parents of absent learners
  const absentIds = records.filter(r => r.status === 'absent').map(r => r.learner_id);
  if (absentIds.length > 0) {
    const { data: learners } = await supabase
      .from('learners')
      .select('learner_id, parent_id, learner_profiles(first_name, last_name)')
      .in('learner_id', absentIds)
      .not('parent_id', 'is', null);

    const { data: prog } = await supabase
      .from('programs').select('program_name').eq('program_id', program_id).single();

    for (const l of (learners || [])) {
      const name = `${(l as any).learner_profiles?.first_name} ${(l as any).learner_profiles?.last_name}`;
      try {
        await supabase.from('notifications').insert({
          user_id:    (l as any).parent_id,
          learner_id: l.learner_id,
          type:       'absence',
          title:      `${name} was marked absent`,
          body:       `${name} was absent from ${(prog as any)?.program_name || 'a session'} on ${session_date}.`,
        });
      } catch (_) {}
    }
  }

  return ok({ saved: data?.length || rows.length, session_date, program_id });
}
