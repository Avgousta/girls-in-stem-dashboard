import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import SponsorReportsClient from './SponsorReportsClient';
import { DS } from '@/components/platform/tokens';
import { FileText } from 'lucide-react';
import Link from 'next/link';

export default async function SponsorReportsPage() {
  const user     = await requireAuth(['sponsor']);
  const supabase = await createClient();

  const { data: links } = await supabase
    .from('sponsor_learners').select('learner_id').eq('sponsor_id', user.sponsor_id);
  const ids = (links || []).map(l => l.learner_id);

  const { data: sponsor } = await supabase
    .from('sponsors').select('sponsor_name').eq('sponsor_id', user.sponsor_id).single();

  if (!ids.length) return (
    <div className="text-center py-20 rounded-2xl" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
      <p className="font-semibold" style={{ color: DS.textMuted }}>No learners linked yet.</p>
    </div>
  );

  // Saved impact reports
  const { data: savedReports } = await supabase
    .from('sponsor_reports')
    .select('report_id, period_start, period_end, report_type, sent_at, created_at')
    .eq('sponsor_id', user.sponsor_id!)
    .order('period_start', { ascending: false })
    .limit(8);

  const [assRes, attRes, projRes, learnersRes] = await Promise.all([
    supabase.from('assessments')
      .select('subject, percentage, grade_band, assessment_date, learner_id, programs(program_name)')
      .in('learner_id', ids).order('assessment_date'),
    supabase.from('attendance')
      .select('status, session_date, learner_id')
      .in('learner_id', ids).order('session_date'),
    supabase.from('projects')
      .select('project_name, completion_status, stage, score, max_score, learner_id, programs(program_name)')
      .in('learner_id', ids),
    supabase.from('learners')
      .select('learner_id, learner_code, learner_profiles(first_name, last_name), schools(school_name), risk_scores(risk_level, attendance_rate, avg_score), program_enrollments(programs(program_name, program_type))')
      .in('learner_id', ids),
  ]);

  // Supabase's SDK infers joins as arrays; cast through unknown to our typed props
  type ClientProps = Parameters<typeof SponsorReportsClient>[0];
  type SavedReport = { report_id: string; period_start: string; period_end: string; report_type: string; sent_at: string | null; created_at: string };
  const reports = (savedReports || []) as unknown as SavedReport[];
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-8">
      {/* Saved impact reports */}
      {reports.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: DS.textMuted }}>
            Your Impact Reports
          </p>
          <div className="space-y-2">
            {reports.map(r => (
              <Link key={r.report_id} href={`/api/v1/reports/sponsor/${r.report_id}`} target="_blank"
                className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
                style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
                <FileText className="w-4 h-4 shrink-0" style={{ color: DS.primary }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold capitalize" style={{ color: DS.text }}>
                    {r.report_type} Report
                  </p>
                  <p className="text-xs" style={{ color: DS.textMuted }}>
                    {fmt(r.period_start)} – {fmt(r.period_end)}
                    {r.sent_at && <span> · Emailed {fmt(r.sent_at)}</span>}
                  </p>
                </div>
                <span className="text-xs font-semibold shrink-0" style={{ color: DS.primary }}>View ↗</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <SponsorReportsClient
      sponsorName={(sponsor as unknown as { sponsor_name: string } | null)?.sponsor_name || 'Sponsor'}
      assessments={(assRes.data || []) as unknown as ClientProps['assessments']}
      attendance={(attRes.data || []) as unknown as ClientProps['attendance']}
      projects={(projRes.data || []) as unknown as ClientProps['projects']}
      learners={(learnersRes.data || []) as unknown as ClientProps['learners']}
      />
    </div>
  );
}
