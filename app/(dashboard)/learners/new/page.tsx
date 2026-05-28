import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import NewLearnerForm from '@/components/forms/NewLearnerForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

async function getFormData() {
  const supabase = await createClient();
  const [schoolsRes, programsRes] = await Promise.all([
    supabase
      .from('schools')
      .select('school_id, school_name')
      .eq('is_active', true)
      .order('school_name'),
    supabase
      .from('programs')
      .select('program_id, program_name, program_type')
      .eq('is_active', true)
      .order('program_name'),
  ]);
  return {
    schools:  schoolsRes.data  || [],
    programs: programsRes.data || [],
  };
}

export default async function NewLearnerPage() {
  await requireAuth(['admin']);
  const { schools, programs } = await getFormData();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/learners"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Learners
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Register New Learner</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Fill in the learner's details to register them on the platform.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <NewLearnerForm schools={schools} programs={programs} />
      </div>
    </div>
  );
}
