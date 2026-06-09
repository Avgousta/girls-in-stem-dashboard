import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import BulkReportsClient from './BulkReportsClient';
import { DS } from '@/components/platform/tokens';
import { FileText } from 'lucide-react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

async function getLearners() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('learners')
    .select(`
      learner_id, learner_code, grade, programme_status,
      learner_profiles(first_name, last_name),
      schools(school_name),
      risk_scores(risk_level, avg_score, attendance_rate)
    `)
    .eq('programme_status', 'active')
    .order('learner_code');
  return (data || []).map((l: any) => ({
    learner_id:   l.learner_id,
    learner_code: l.learner_code,
    grade:        l.grade,
    full_name:    `${l.learner_profiles?.first_name ?? ''} ${l.learner_profiles?.last_name ?? ''}`.trim(),
    school_name:  l.schools?.school_name ?? '—',
    risk_level:   l.risk_scores?.risk_level ?? 'low',
    avg_score:    l.risk_scores?.avg_score ?? 0,
    att_rate:     l.risk_scores?.attendance_rate ?? 0,
  }));
}

export default async function BulkReportsPage() {
  await requireAuth(['admin', 'instructor']);
  const learners = await getLearners();

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <Link href="/reports"
          className="inline-flex items-center gap-1.5 text-sm hover:underline mb-3"
          style={{ color: DS.textMuted }}>
          <ArrowLeft className="w-4 h-4" /> Back to Reports
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: DS.text }}>
          <FileText className="w-6 h-6" style={{ color: DS.primary }} /> Bulk Report Export
        </h1>
        <p className="text-sm mt-0.5" style={{ color: DS.textMuted }}>
          Select learners and open their report cards — {learners.length} active learners
        </p>
      </div>
      <BulkReportsClient learners={learners} />
    </div>
  );
}
