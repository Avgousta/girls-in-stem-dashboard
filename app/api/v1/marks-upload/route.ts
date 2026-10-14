export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err } from '@/app/api/helpers';
import { createAdminClient } from '@/lib/supabase/server';
import { parseStandardLabel, buildLabel } from '@/lib/marks-upload';

// Saves an Excel mark upload in one transaction (see apply_mark_import in
// migration 025). dry_run defaults to true: the import runs and is rolled back,
// returning exactly what a real save would do.
const mappingSchema = z.object({
  header_key: z.string().min(1).max(200),
  kind:       z.enum(['term', 'baseline', 'application', 'june_assignment', 'ignore']),
  source:     z.enum(['Melisizwe', 'School']).nullable().optional(),
  subject:    z.enum(['Maths', 'Science']).nullable().optional(),
  term:       z.number().int().min(1).max(4).nullable().optional(),
  grade:      z.number().int().min(7).max(12).nullable().optional(),
});

const schema = z.object({
  program_id:  z.string().uuid(),
  source_name: z.string().min(1).max(200),
  dry_run:     z.boolean().default(true),
  rows: z.array(z.object({
    learner_id: z.string().uuid(),
    notes:      z.string().min(1),
    score:      z.number().min(0).max(100),
  })).min(1).max(10000),
  mappings: z.array(mappingSchema).max(500).default([]),
  aliases:  z.array(z.object({ alias_key: z.string().min(1).max(200), learner_id: z.string().uuid() })).max(1000).default([]),
});

export async function POST(req: NextRequest) {
  const { profile, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err(parsed.error.issues[0].message);
  const d = parsed.data;

  const admin = createAdminClient();

  // Only learners enrolled in the chosen programme
  const { data: enrol, error: enrolErr } = await admin
    .from('program_enrollments').select('learner_id').eq('program_id', d.program_id);
  if (enrolErr) return err(enrolErr.message, 500);
  const enrolled = new Set((enrol ?? []).map((e: { learner_id: string }) => e.learner_id));

  // Rebuild each mark's subject/type/term/date from its label so the client
  // can't send a label and metadata that disagree.
  const rows = [];
  for (const r of d.rows) {
    if (!enrolled.has(r.learner_id)) return err('A learner in this upload is not enrolled in the selected programme', 400);
    const std  = parseStandardLabel(r.notes);
    const meta = std && buildLabel(std.mapping, std.year);
    if (!meta || meta.notes !== r.notes) return err(`Not a standard mark label: "${r.notes}"`, 400);
    rows.push({ learner_id: r.learner_id, score: r.score, ...meta });
  }

  if (!d.dry_run) {
    if (d.mappings.length) {
      const { error } = await admin.from('mark_column_mappings').upsert(
        d.mappings.map(m => ({ ...m, updated_by: profile!.user_id, updated_at: new Date().toISOString() })),
        { onConflict: 'header_key' });
      if (error) return err(error.message, 500);
    }
    const aliases = d.aliases.filter(a => enrolled.has(a.learner_id));
    if (aliases.length) {
      const { error } = await admin.from('learner_name_aliases').upsert(
        aliases.map(a => ({ ...a, created_by: profile!.user_id })), { onConflict: 'alias_key' });
      if (error) return err(error.message, 500);
    }
  }

  const { data, error } = await admin.rpc('apply_mark_import', {
    p_program_id:  d.program_id,
    p_rows:        rows,
    p_actor:       profile!.user_id,
    p_source_name: d.source_name,
    p_dry_run:     d.dry_run,
  });
  if (error) return err(error.message, 500);
  return ok(data);
}
