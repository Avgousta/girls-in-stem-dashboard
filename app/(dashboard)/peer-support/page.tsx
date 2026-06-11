import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { DS } from '@/components/platform/tokens';
import PeerSupportClient from './PeerSupportClient';

async function getData() {
  const supabase = await createClient();

  const [pairsRes, programsRes] = await Promise.all([
    supabase
      .from('peer_support_pairs')
      .select(`
        pair_id, status, notes, started_at, ended_at, created_at,
        tutor:learners!tutor_id(learner_id, grade, learner_profiles(first_name, last_name), risk_scores(avg_score)),
        mentee:learners!mentee_id(learner_id, grade, learner_profiles(first_name, last_name), risk_scores(risk_level, risk_trajectory)),
        programs(program_name),
        creator:users!created_by(full_name)
      `)
      .neq('status', 'ended')
      .order('created_at', { ascending: false }),
    supabase
      .from('programs')
      .select('program_id, program_name')
      .eq('is_active', true)
      .order('program_name'),
  ]);

  return {
    pairs:    pairsRes.data    ?? [],
    programs: programsRes.data ?? [],
  };
}

export default async function PeerSupportPage() {
  await requireAuth(['admin', 'instructor']);
  const { pairs, programs } = await getData();

  return (
    <div className="max-w-5xl space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: DS.text }}>Peer Support Pairs</h1>
        <p className="text-sm mt-1" style={{ color: DS.textMuted }}>
          Match high-performing learners as near-peer tutors for at-risk classmates.
        </p>
      </div>

      <PeerSupportClient initialPairs={pairs as never} programs={programs} />
    </div>
  );
}
