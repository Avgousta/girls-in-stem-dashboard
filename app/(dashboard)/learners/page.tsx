import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import LearnersClient from './LearnersClient';
import Link from 'next/link';
import { PlusCircle, Upload, Users } from 'lucide-react';

async function getLearners() {
  const supabase = await createClient();

  const [learnerRes, sponsorLinksRes] = await Promise.all([
    supabase.from('learners').select(`
      learner_id, learner_code, grade, enrollment_date, programme_status,
      learner_profiles(first_name, last_name, email),
      schools(school_name),
      risk_scores(risk_level, attendance_rate, avg_score),
      program_enrollments(programs(program_name))
    `).order('learner_code'),

    supabase.from('sponsor_learners')
      .select('learner_id, sponsor_id, sponsors(sponsor_id, sponsor_name)'),
  ]);

  const sponsorMap: Record<string, Array<{ sponsor_id: string; sponsor_name: string }>> = {};
  (sponsorLinksRes.data || []).forEach((link: any) => {
    if (!sponsorMap[link.learner_id]) sponsorMap[link.learner_id] = [];
    if (link.sponsors) sponsorMap[link.learner_id].push({
      sponsor_id: link.sponsors.sponsor_id, sponsor_name: link.sponsors.sponsor_name,
    });
  });

  return (learnerRes.data || []).map((l: any) => ({
    id:         l.learner_id,
    code:       l.learner_code,
    grade:      l.grade,
    enrolled:   l.enrollment_date,
    status:     l.programme_status,
    first_name: l.learner_profiles?.first_name ?? '',
    last_name:  l.learner_profiles?.last_name  ?? '',
    email:      l.learner_profiles?.email      ?? '',
    school:     l.schools?.school_name         ?? '—',
    risk:       l.risk_scores?.risk_level      ?? 'low',
    att:        Math.floor(l.risk_scores?.attendance_rate ?? 0),
    score:      Math.round(l.risk_scores?.avg_score       ?? 0),
    sponsors:   sponsorMap[l.learner_id] || [],
    programmes: (l.program_enrollments || []).map((e: any) => e.programs?.program_name).filter(Boolean),
  }));
}

async function getSponsors() {
  const supabase = await createClient();
  const { data } = await supabase.from('sponsors')
    .select('sponsor_id, sponsor_name').eq('is_active', true).order('sponsor_name');
  return data || [];
}

export default async function LearnersPage() {
  const user = await requireAuth(['admin', 'instructor']);
  const [learners, sponsors] = await Promise.all([getLearners(), getSponsors()]);
  const isAdmin = user.role === 'admin';

  const grades  = Array.from(new Set(learners.map(l => l.grade))).sort((a, b) => a - b);
  const schools = Array.from(new Set(learners.map(l => l.school))).filter(s => s !== '—').sort();

  const active   = learners.filter(l => l.status === 'active').length;
  const highRisk = learners.filter(l => l.risk === 'high').length;

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--ds-text)' }}>
            <Users className="w-6 h-6" style={{ color: 'var(--ds-purple)' }} />
            Learners
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>
            {learners.length} registered · {active} active
            {highRisk > 0 && (
              <> · <span className="font-semibold" style={{ color: 'var(--ds-danger)' }}>{highRisk} high risk</span></>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/learners/bulk" className="btn-secondary">
            <Upload className="w-4 h-4" /> Bulk Import
          </Link>
          {isAdmin && (
            <Link href="/learners/new" className="btn-primary">
              <PlusCircle className="w-4 h-4" /> Add Learner
            </Link>
          )}
        </div>
      </div>

      <LearnersClient
        learners={learners}
        sponsors={sponsors}
        grades={grades}
        schools={schools}
        isAdmin={isAdmin}
      />
    </div>
  );
}
