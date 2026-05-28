import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import EditProgramForm from './EditProgramForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Props { params: Promise<{ id: string }> }

async function getPageData(id: string) {
  const supabase = await createClient();
  const [programRes, instructorsRes] = await Promise.all([
    supabase.from('programs').select('*').eq('program_id', id).single(),
    supabase.from('users').select('user_id, full_name').in('role', ['instructor','admin']).order('full_name'),
  ]);
  return {
    program:     programRes.data,
    instructors: instructorsRes.data || [],
  };
}

export default async function EditProgramPage({ params }: Props) {
  await requireAuth(['admin']);
  const { id } = await params;
  const { program, instructors } = await getPageData(id);
  if (!program) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/programs"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Programmes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Programme</h1>
        <p className="text-sm text-gray-500 mt-0.5">Update the details for <strong>{program.program_name}</strong></p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <EditProgramForm program={program} instructors={instructors} />
      </div>
    </div>
  );
}
