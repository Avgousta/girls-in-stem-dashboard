export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created } from '@/app/api/helpers';

// ── Column mapping schema ──────────────────────────────────────────────────
const mappingSchema = z.object({
  program_id:     z.string().uuid(),
  source_name:    z.string(),
  source_type:    z.enum(['csv','excel','siyavula','greenbook','generic']).default('generic'),
  // Column name → field mapping
  col_identifier: z.string(),  // learner_code OR first_last name column
  col_subject:    z.string(),
  col_score:      z.string(),
  col_max_score:  z.string().optional().nullable(),
  col_date:       z.string().optional().nullable(),
  col_term:       z.string().optional().nullable(),
  col_type:       z.string().optional().nullable(),
  col_notes:      z.string().optional().nullable(),
  // Static overrides when no column exists
  default_max_score:    z.number().default(100),
  default_type:         z.enum(['quiz','test','project','practical','assignment','oral','other']).default('test'),
  default_term:         z.number().int().min(1).max(4).optional().nullable(),
  default_date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date').optional().nullable(),
  // The parsed CSV rows
  rows: z.array(z.record(z.string(), z.unknown())),
});

export async function GET(_req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin','instructor']);
  if (denied) return denied;

  const { data, error } = await supabase
    .from('import_jobs')
    .select('job_id, source_name, source_type, program_id, rows_total, rows_imported, rows_skipped, status, created_at, completed_at, programs(program_name)')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return err(error.message, 500);
  return ok(data);
}

export async function POST(req: NextRequest) {
  const { supabase, profile, denied } = await requireApiAuth(['admin','instructor']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = mappingSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const m = parsed.data;

  // Helper: safely get a string value from a row
  const get = (row: Record<string, unknown>, col: string): string =>
    String(row[col] ?? '');

  // ── Fetch learner lookup maps ──────────────────────────────────────────────
  const { data: learners } = await supabase
    .from('learners')
    .select('learner_id, learner_code, learner_profiles(first_name, last_name)')
    .eq('programme_status', 'active');

  type LearnerRow = { learner_id: string; learner_code: string; learner_profiles: { first_name: string; last_name: string } | null };
  const allLearners = (learners || []) as unknown as LearnerRow[];

  // Build lookup: learner_code → id, "firstname lastname" → id
  const codeMap: Record<string, string> = {};
  const nameMap: Record<string, string> = {};
  allLearners.forEach(l => {
    codeMap[l.learner_code.toLowerCase()] = l.learner_id;
    if (l.learner_profiles) {
      const full = `${l.learner_profiles.first_name} ${l.learner_profiles.last_name}`.trim().toLowerCase();
      nameMap[full] = l.learner_id;
      // Also try last, first
      nameMap[`${l.learner_profiles.last_name} ${l.learner_profiles.first_name}`.trim().toLowerCase()] = l.learner_id;
    }
  });

  function resolveId(raw: string): string | null {
    const key = raw.trim().toLowerCase();
    return codeMap[key] ?? nameMap[key] ?? null;
  }

  // ── Process rows ───────────────────────────────────────────────────────────
  const inserts: Record<string, unknown>[] = [];
  const skipped: string[] = [];

  for (const row of m.rows) {
    const identifierRaw = get(row, m.col_identifier).trim();
    if (!identifierRaw) { skipped.push('blank identifier'); continue; }

    const learnerId = resolveId(identifierRaw);
    if (!learnerId) { skipped.push(`no match: ${identifierRaw}`); continue; }

    const scoreRaw = parseFloat(get(row, m.col_score));
    if (isNaN(scoreRaw)) { skipped.push(`invalid score for ${identifierRaw}`); continue; }

    const maxScore  = m.col_max_score ? parseFloat(get(row, m.col_max_score)) || m.default_max_score : m.default_max_score;
    const subject   = get(row, m.col_subject).trim() || 'Unknown';
    const dateRaw   = m.col_date ? get(row, m.col_date).trim() : m.default_date;
    const termRaw   = m.col_term ? parseInt(get(row, m.col_term)) : m.default_term;
    const typeRaw   = m.col_type ? get(row, m.col_type).trim() : m.default_type;
    const notesRaw  = m.col_notes ? get(row, m.col_notes).trim() : null;

    // Parse date — accept YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY
    let assessmentDate = dateRaw || m.default_date || null;
    if (assessmentDate && /^\d{2}\/\d{2}\/\d{4}$/.test(assessmentDate)) {
      const [d, mo, yr] = assessmentDate.split('/');
      assessmentDate = `${yr}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }

    const VALID_TYPES = ['quiz','test','project','practical','assignment','oral','other'];
    const assessType = VALID_TYPES.includes((typeRaw ?? '').toLowerCase())
      ? (typeRaw ?? '').toLowerCase()
      : m.default_type;

    inserts.push({
      learner_id:      learnerId,
      program_id:      m.program_id,
      subject,
      score:           scoreRaw,
      max_score:       isNaN(maxScore) ? m.default_max_score : maxScore,
      assessment_date: assessmentDate,
      term:            (!isNaN(termRaw as number) && (termRaw as number) >= 1 && (termRaw as number) <= 4) ? termRaw : m.default_term ?? null,
      assessment_type: assessType,
      notes:           notesRaw || null,
      difficulty:      'medium',
    });
  }

  // ── Save job record ────────────────────────────────────────────────────────
  const { data: job, error: jobErr } = await supabase
    .from('import_jobs')
    .insert({
      created_by:    profile?.user_id,
      source_name:   m.source_name,
      source_type:   m.source_type,
      program_id:    m.program_id,
      rows_total:    m.rows.length,
      rows_imported: 0,
      rows_skipped:  skipped.length,
      status:        'processing',
    })
    .select().single();

  if (jobErr || !job) return err('Could not create import job', 500);
  const jobId = (job as { job_id: string }).job_id;

  // ── Batch insert assessments (chunks of 50) ───────────────────────────────
  let imported = 0;
  const CHUNK = 50;
  for (let i = 0; i < inserts.length; i += CHUNK) {
    const chunk = inserts.slice(i, i + CHUNK);
    const { error: insErr } = await supabase.from('assessments').insert(chunk);
    if (!insErr) imported += chunk.length;
  }

  // Recalculate risk scores
  try { await supabase.rpc('calculate_risk_scores'); } catch (_) {}

  // Update job record
  await supabase.from('import_jobs').update({
    rows_imported: imported,
    rows_skipped:  m.rows.length - imported,
    status:        'complete',
    completed_at:  new Date().toISOString(),
    error_log:     skipped.length > 0 ? skipped.slice(0, 20).join('\n') : null,
  }).eq('job_id', jobId);

  return created({ job_id: jobId, imported, skipped: m.rows.length - imported, total: m.rows.length });
}
