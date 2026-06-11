import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import ImportsClient from './ImportsClient';
import { DS } from '@/components/platform/tokens';
import { Upload } from 'lucide-react';

async function getImportData() {
  const supabase = await createClient();
  const [programsRes, jobsRes] = await Promise.all([
    supabase.from('programs').select('program_id, program_name').eq('is_active', true).order('program_name'),
    supabase.from('import_jobs').select(`
      job_id, source_name, source_type, rows_total, rows_imported,
      rows_skipped, status, created_at, completed_at,
      programs(program_name)
    `).order('created_at', { ascending: false }).limit(20),
  ]);
  return {
    programs: (programsRes.data || []) as { program_id: string; program_name: string }[],
    jobs:     (jobsRes.data     || []) as unknown as ImportJob[],
  };
}

export interface ImportJob {
  job_id:        string;
  source_name:   string;
  source_type:   string;
  rows_total:    number;
  rows_imported: number;
  rows_skipped:  number;
  status:        string;
  created_at:    string;
  completed_at:  string | null;
  programs:      { program_name: string } | null;
}

export default async function ImportsPage() {
  await requireAuth(['admin']);
  const { programs, jobs } = await getImportData();

  return (
    <div className="max-w-5xl space-y-6 pb-20" style={{ color: DS.text }}>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: DS.textMuted }}>
          Data Import
        </p>
        <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: DS.text }}>
          <Upload className="w-6 h-6" style={{ color: DS.primary }} />
          School LMS Import
        </h1>
        <p className="text-sm mt-0.5" style={{ color: DS.textMuted }}>
          Import assessment marks from any school LMS — Siyavula, GreenBook, or any CSV export.
        </p>
      </div>

      <ImportsClient programmes={programs} initialJobs={jobs} />
    </div>
  );
}
