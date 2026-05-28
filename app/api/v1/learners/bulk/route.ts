import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err } from '@/app/api/helpers';

const rowSchema = z.object({
  first_name:      z.string().min(1, 'First name required'),
  last_name:       z.string().min(1, 'Last name required'),
  grade:           z.coerce.number().int().min(8).max(12, 'Grade must be 8-12'),
  school_id:       z.string().uuid('Invalid school ID'),
  program_id:      z.string().uuid('Invalid programme ID'),
  email:           z.string().email('Invalid email').optional().or(z.literal('')),
  phone:           z.string().optional(),
  parent_name:     z.string().optional(),
  parent_contact:  z.string().optional(),
  enrollment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

const bulkSchema = z.object({
  learners: z.array(rowSchema).min(1).max(200),
});

export async function POST(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    const msgs = parsed.error.issues.map(i => {
      const row = typeof i.path[1] === 'number' ? `Row ${i.path[1] + 1}: ` : '';
      return `${row}${i.message}`;
    }).join(' | ');
    return err(msgs);
  }

  const learners = parsed.data.learners;

  // Get current max learner code to generate sequential codes
  const { data: existing } = await supabase
    .from('learners')
    .select('learner_code')
    .order('learner_code', { ascending: false })
    .limit(1);

  let nextNum = 1;
  if (existing?.length) {
    const num = parseInt((existing[0].learner_code || '').replace(/\D/g, ''), 10);
    if (!isNaN(num)) nextNum = num + 1;
  }

  const results = { created: 0, failed: 0, errors: [] as string[] };

  for (let i = 0; i < learners.length; i++) {
    const d = learners[i];
    try {
      const learnerCode = `LRN${String(nextNum).padStart(3, '0')}`;
      nextNum++;

      const { data: learner, error: lerr } = await supabase
        .from('learners')
        .insert({
          school_id:        d.school_id,
          grade:            Number(d.grade),
          enrollment_date:  d.enrollment_date,
          learner_code:     learnerCode,
          programme_status: 'active',
        })
        .select('learner_id')
        .single();

      if (lerr) {
        results.failed++;
        results.errors.push(`Row ${i + 1} (${d.first_name} ${d.last_name}): ${lerr.message}`);
        nextNum--; // reclaim the code
        continue;
      }

      await supabase.from('learner_profiles').insert({
        learner_id:     learner.learner_id,
        first_name:     d.first_name,
        last_name:      d.last_name,
        email:          d.email   || null,
        phone:          d.phone   || null,
        parent_name:    d.parent_name    || null,
        parent_contact: d.parent_contact || null,
      });

      await supabase.from('program_enrollments').insert({
        learner_id: learner.learner_id,
        program_id: d.program_id,
        status:     'active',
      });

      await supabase.from('risk_scores').insert({
        learner_id: learner.learner_id,
        risk_level: 'low',
      });

      results.created++;
    } catch (e: any) {
      results.failed++;
      results.errors.push(`Row ${i + 1}: ${e.message}`);
    }
  }

  return ok(results);
}
