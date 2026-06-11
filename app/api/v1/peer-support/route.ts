export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created } from '@/app/api/helpers';

// ── Thresholds for tutor eligibility ─────────────────────────────────────────
const TUTOR_MIN_ATT_RATE  = 0.75; // 75% attendance
const TUTOR_MIN_AVG_SCORE = 65;   // avg score %
const BAD_TRAJECTORIES    = ['declining', 'critical'];

// GET /api/v1/peer-support
// ?program_id=  filter by programme
// ?status=      filter by pair status (default: all except ended)
// ?suggest=true return suggested auto-pairings (not yet saved)
export async function GET(req: NextRequest) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const sp        = req.nextUrl.searchParams;
  const programId = sp.get('program_id');
  const status    = sp.get('status');
  const suggest   = sp.get('suggest') === 'true';

  if (suggest) {
    // ── Return suggested pairings from eligibility algo ───────────────────
    const [learnersRes, existingRes] = await Promise.all([
      supabase
        .from('learners')
        .select(`
          learner_id, grade,
          learner_profiles(first_name, last_name),
          program_enrollments(program_id, programs(program_name)),
          attendance(status),
          risk_scores(risk_level, avg_score, risk_trajectory),
          assessments(percentage)
        `)
        .eq('programme_status', 'active'),
      supabase
        .from('peer_support_pairs')
        .select('tutor_id, mentee_id')
        .neq('status', 'ended'),
    ]);

    if (learnersRes.error) return err(learnersRes.error.message, 500);

    interface EnrolRow  { program_id: string; programs: { program_name: string } | null }
    interface AttRow    { status: string }
    interface AssRow    { percentage: number | null }
    interface ProfRow   { first_name: string; last_name: string }
    interface RiskRow   { risk_level: string; avg_score: number | null; risk_trajectory: string | null }
    interface LRow {
      learner_id: string; grade: number | null;
      learner_profiles: ProfRow | null;
      program_enrollments: EnrolRow[];
      attendance: AttRow[];
      risk_scores: RiskRow | null;
      assessments: AssRow[];
    }

    const learners = (learnersRes.data ?? []) as unknown as LRow[];

    // Build set of already-paired learner ids (either role)
    const alreadyPaired = new Set<string>();
    for (const p of (existingRes.data ?? [])) {
      alreadyPaired.add(p.tutor_id);
      alreadyPaired.add(p.mentee_id);
    }

    // Score each learner
    const scored = learners.map(l => {
      const att = l.attendance ?? [];
      const attRate = att.length
        ? att.filter(a => a.status === 'present').length / att.length
        : 0;
      const avgScore = l.risk_scores?.avg_score ?? 0;
      const trajectory = l.risk_scores?.risk_trajectory ?? 'stable';
      const riskLevel  = l.risk_scores?.risk_level  ?? 'low';
      const name = `${l.learner_profiles?.first_name ?? ''} ${l.learner_profiles?.last_name ?? ''}`.trim();
      const programs = (l.program_enrollments ?? []) as EnrolRow[];

      const isTutorEligible =
        !alreadyPaired.has(l.learner_id) &&
        attRate  >= TUTOR_MIN_ATT_RATE   &&
        avgScore >= TUTOR_MIN_AVG_SCORE  &&
        !BAD_TRAJECTORIES.includes(trajectory);

      const isMenteeEligible =
        !alreadyPaired.has(l.learner_id) &&
        (riskLevel === 'high' || riskLevel === 'medium');

      return { ...l, name, attRate, avgScore, trajectory, riskLevel, programs, isTutorEligible, isMenteeEligible };
    });

    // Filter to program if requested
    const inProgram = (l: typeof scored[0]) =>
      !programId || l.programs.some(e => e.program_id === programId);

    const tutors  = scored.filter(l => l.isTutorEligible  && inProgram(l))
      .sort((a, b) => b.avgScore - a.avgScore);
    const mentees = scored.filter(l => l.isMenteeEligible && inProgram(l))
      .sort((a, b) => {
        const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
        return (order[a.riskLevel] ?? 2) - (order[b.riskLevel] ?? 2);
      });

    // Greedy 1:1 matching — same grade preferred, then same programme
    const usedTutors = new Set<string>();
    const suggestions: Array<{
      tutor: { learner_id: string; name: string; attRate: number; avgScore: number; programs: EnrolRow[] };
      mentee: { learner_id: string; name: string; riskLevel: string; programs: EnrolRow[] };
      shared_program: string | null;
    }> = [];

    for (const mentee of mentees) {
      const menteeProgramIds = new Set(mentee.programs.map(e => e.program_id));

      // Prefer same-grade + shared programme
      const candidate = tutors.find(t =>
        !usedTutors.has(t.learner_id) &&
        t.grade === mentee.grade &&
        t.programs.some(e => menteeProgramIds.has(e.program_id))
      ) ?? tutors.find(t =>
        !usedTutors.has(t.learner_id) &&
        t.programs.some(e => menteeProgramIds.has(e.program_id))
      ) ?? tutors.find(t => !usedTutors.has(t.learner_id));

      if (!candidate) continue;

      const sharedProg = candidate.programs.find(e => menteeProgramIds.has(e.program_id));
      usedTutors.add(candidate.learner_id);

      suggestions.push({
        tutor:  { learner_id: candidate.learner_id, name: candidate.name, attRate: candidate.attRate, avgScore: candidate.avgScore, programs: candidate.programs },
        mentee: { learner_id: mentee.learner_id,    name: mentee.name,    riskLevel: mentee.riskLevel, programs: mentee.programs },
        shared_program: sharedProg?.programs?.program_name ?? null,
      });
    }

    return ok({ suggestions, tutor_pool: tutors.length, mentee_pool: mentees.length });
  }

  // ── Return saved pairs ────────────────────────────────────────────────────
  let q = supabase
    .from('peer_support_pairs')
    .select(`
      pair_id, status, notes, started_at, ended_at, created_at,
      tutor:learners!tutor_id(learner_id, learner_profiles(first_name, last_name), risk_scores(avg_score)),
      mentee:learners!mentee_id(learner_id, learner_profiles(first_name, last_name), risk_scores(risk_level)),
      programs(program_name),
      creator:users!created_by(full_name)
    `)
    .order('created_at', { ascending: false });

  if (programId) q = q.eq('program_id', programId) as typeof q;
  if (status)    q = q.eq('status', status) as typeof q;
  else           q = q.neq('status', 'ended') as typeof q;

  const { data, error } = await q;
  if (error) return err(error.message, 500);
  return ok(data);
}

const createSchema = z.object({
  tutor_id:   z.string().uuid(),
  mentee_id:  z.string().uuid(),
  program_id: z.string().uuid().optional(),
  notes:      z.string().optional(),
});

// POST /api/v1/peer-support
export async function POST(req: NextRequest) {
  const { supabase, profile, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const body   = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { data, error } = await supabase
    .from('peer_support_pairs')
    .insert({ ...parsed.data, created_by: profile?.user_id, status: 'active', started_at: new Date().toISOString().slice(0, 10) })
    .select()
    .single();

  if (error) return err(error.message, 500);
  return created(data);
}
