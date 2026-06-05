import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import BulkImportClient from './BulkImportClient';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DS } from '@/components/platform/tokens';

async function getFormData() {
  const supabase = await createClient();
  const [schoolsRes, programsRes] = await Promise.all([
    supabase.from('schools').select('school_id, school_name').eq('is_active', true).order('school_name'),
    supabase.from('programs').select('program_id, program_name').eq('is_active', true).order('program_name'),
  ]);
  return {
    schools:  schoolsRes.data  || [],
    programs: programsRes.data || [],
  };
}

export default async function BulkImportPage() {
  await requireAuth(['admin']);
  const { schools, programs } = await getFormData();

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <Link href="/learners"
          className="inline-flex items-center gap-1.5 text-sm hover:underline mb-4"
          style={{ color: DS.textMuted }}>
          <ArrowLeft className="w-4 h-4" /> Back to Learners
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: DS.text }}>Bulk Import Learners</h1>
        <p className="text-sm mt-0.5" style={{ color: DS.textMuted }}>
          Upload a CSV file or paste data to register multiple learners at once. Up to 200 per import.
        </p>
      </div>
      <BulkImportClient schools={schools} programs={programs} />
    </div>
  );
}
