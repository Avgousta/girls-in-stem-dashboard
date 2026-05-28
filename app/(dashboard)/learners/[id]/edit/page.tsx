import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import EditLearnerForm from './EditLearnerForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Props { params: Promise<{ id: string }> }

async function getPageData(id: string) {
  const supabase = await createClient();
  const [learnerRes, schoolsRes, programsRes] = await Promise.all([
    supabase
      .from('learners')
      .select('*, learner_profiles(*), schools(school_name), program_enrollments(program_id, status, programs(program_name, program_type))')
      .eq('learner_id', id)
      .single(),
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
    learner:  learnerRes.data,
    schools:  schoolsRes.data  || [],
    programs: programsRes.data || [],
  };
}

export default async function EditLearnerPage({ params }: Props) {
  await requireAuth(['admin']);
  const { id } = await params;
  const { learner, schools, programs } = await getPageData(id);
  if (!learner) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href={`/learners/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Profile
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Learner</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Update details for <strong>{learner.learner_profiles?.first_name} {learner.learner_profiles?.last_name}</strong>
          {' '}· <span className="font-mono">{learner.learner_code}</span>
        </p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <EditLearnerForm learner={learner} schools={schools} programs={programs} />
      </div>
    </div>
  );
}
