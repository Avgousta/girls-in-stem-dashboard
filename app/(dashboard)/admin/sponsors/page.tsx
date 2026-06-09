import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import SponsorManager from './SponsorManager';
import { Award, Link2 } from 'lucide-react';
import Link from 'next/link';
import { DS } from '@/components/platform/tokens';

export default async function AdminSponsorsPage() {
  await requireAuth(['admin']);
  const supabase = await createClient();

  const [sponsorsRes, learnersRes, linksRes] = await Promise.all([
    // Sponsors with their login users
    supabase
      .from('sponsors')
      .select('sponsor_id, sponsor_name, contact_name, contact_email, is_active, created_at, users!sponsor_id(user_id, full_name, email)')
      .order('sponsor_name'),

    // All active learners for the link modal
    supabase
      .from('learners')
      .select('learner_id, learner_code, learner_profiles(first_name, last_name), schools(school_name)')
      .eq('programme_status', 'active')
      .order('learner_code'),

    // All sponsor-learner links — we'll count these ourselves
    supabase
      .from('sponsor_learners')
      .select('sponsor_id, learner_id'),
  ]);

  // Build real count per sponsor from the links table
  const countMap: Record<string, number> = {};
  (linksRes.data || []).forEach(lnk => {
    countMap[lnk.sponsor_id] = (countMap[lnk.sponsor_id] || 0) + 1;
  });

  interface SponsorRow { sponsor_id: string; sponsor_name: string; users: Array<{ user_id: string; full_name: string; email: string; role: string }> }
  const sponsors = ((sponsorsRes.data || []) as unknown as SponsorRow[]).map(s => ({
    ...s,
    learner_count: countMap[s.sponsor_id] || 0,
    users:         s.users || [],
  }));

  interface LearnerRow { learner_id: string; learner_code: string; learner_profiles: { first_name: string; last_name: string } | null; schools: { school_name: string } | null }
  const allLearners = ((learnersRes.data || []) as unknown as LearnerRow[]).map(l => ({
    learner_id:   l.learner_id,
    learner_code: l.learner_code,
    full_name:    `${l.learner_profiles?.first_name ?? ''} ${l.learner_profiles?.last_name ?? ''}`.trim(),
    school_name:  l.schools?.school_name || '—',
  }));

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: DS.text }}>
            <Award className="w-6 h-6" style={{ color: DS.primary }} /> Sponsor Management
          </h1>
          <p className="text-sm mt-0.5" style={{ color: DS.textMuted }}>
            Manage sponsors, create logins, and link learners
          </p>
        </div>
        <Link href="/admin/sponsors/bulk-link" className="btn-secondary flex items-center gap-2">
          <Link2 className="w-4 h-4" /> Bulk Link Learners
        </Link>
      </div>

      <SponsorManager
        sponsors={sponsors}
        allLearners={allLearners}
        sponsorUsers={[]}
      />
    </div>
  );
}
