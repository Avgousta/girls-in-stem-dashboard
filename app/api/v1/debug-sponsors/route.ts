export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  const [sponsorsRes, linksRes, learnersRes] = await Promise.all([
    supabase.from('sponsors').select('sponsor_id, sponsor_name').order('sponsor_name'),
    supabase.from('sponsor_learners').select('sponsor_id, learner_id'),
    supabase.from('learners').select(`
      learner_id, learner_code,
      learner_profiles(first_name, last_name)
    `).eq('programme_status', 'active').order('learner_code'),
  ]);

  const sponsors = sponsorsRes.data  || [];
  const links    = linksRes.data     || [];
  const learners = learnersRes.data  || [];
  const linkedIds = new Set(links.map((l: any) => l.learner_id));
  const unlinked  = learners.filter((l: any) => !linkedIds.has(l.learner_id));

  return new NextResponse(JSON.stringify({
    sponsors,
    total_links:    links.length,
    total_learners: learners.length,
    unlinked_count: unlinked.length,
    unlinked:       unlinked.map((l: any) => ({
      learner_id:   l.learner_id,
      learner_code: l.learner_code,
      name: `${l.learner_profiles?.first_name} ${l.learner_profiles?.last_name}`,
    })),
  }, null, 2), { headers: { 'Content-Type': 'application/json' } });
}