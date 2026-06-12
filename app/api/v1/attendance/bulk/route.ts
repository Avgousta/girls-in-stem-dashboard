export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err } from '@/app/api/helpers';
import { emailAbsenceAlert } from '@/lib/email';
import { whatsappAbsenceAlert } from '@/lib/whatsapp';

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

  // Notify + email parents of absent learners
  const absentIds = records.filter(r => r.status === 'absent').map(r => r.learner_id);
  if (absentIds.length > 0) {
    const { data: learners } = await supabase
      .from('learners')
      .select('learner_id, parent_id, learner_profiles(first_name, last_name, whatsapp_number, whatsapp_opted_in)')
      .in('learner_id', absentIds)
      .not('parent_id', 'is', null);

    const { data: prog } = await supabase
      .from('programs').select('program_name').eq('program_id', program_id).single();

    interface AbsLearner { learner_id: string; parent_id: string | null; learner_profiles: { first_name: string; last_name: string; whatsapp_number?: string | null; whatsapp_opted_in?: boolean | null } | null }
    const typedProg = prog as unknown as { program_name: string } | null;
    const programName = typedProg?.program_name || 'a session';

    const parentIds = ((learners || []) as unknown as AbsLearner[])
      .map(l => l.parent_id).filter(Boolean) as string[];

    const { data: parentUsers } = parentIds.length > 0
      ? await supabase.from('users').select('user_id, email').in('user_id', parentIds)
      : { data: [] };

    const parentEmailMap = Object.fromEntries(
      ((parentUsers || []) as { user_id: string; email: string }[]).map(u => [u.user_id, u.email])
    );

    await Promise.all(
      ((learners || []) as unknown as AbsLearner[]).map(l => {
        if (!l.parent_id) return Promise.resolve();
        const name        = `${l.learner_profiles?.first_name} ${l.learner_profiles?.last_name}`.trim();
        const parentEmail = parentEmailMap[l.parent_id];
        if (!parentEmail) return Promise.resolve();
        return Promise.all([
          emailAbsenceAlert({
            parentEmail,
            parentUserId: l.parent_id,
            learnerName:  name,
            programName,
            sessionDate:  session_date,
          }).catch(() => {}),
          whatsappAbsenceAlert({
            parentNumber:  l.learner_profiles?.whatsapp_number,
            parentOptedIn: l.learner_profiles?.whatsapp_opted_in,
            learnerName:   name,
            programName,
            sessionDate:   session_date,
          }).catch(() => {}),
        ]);
      })
    );
  }

  return ok({ saved: data?.length || rows.length, session_date, program_id });
}