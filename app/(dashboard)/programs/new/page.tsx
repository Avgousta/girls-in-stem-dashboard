import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import NewProgramForm from './NewProgramForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

async function getInstructors() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('user_id, full_name')
    .in('role', ['instructor', 'admin'])
    .order('full_name');
  return data || [];
}

export default async function NewProgramPage() {
  await requireAuth(['admin']);
  const instructors = await getInstructors();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/programs"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Programmes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create Programme</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Programmes can include learners from any school — no school restriction.
        </p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <NewProgramForm instructors={instructors} />
      </div>
    </div>
  );
}
