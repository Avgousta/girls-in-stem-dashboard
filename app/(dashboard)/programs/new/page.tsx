import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import NewProgramForm from './NewProgramForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DS } from '@/components/platform/tokens';

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
          className="inline-flex items-center gap-1.5 text-sm hover:underline mb-4"
          style={{ color: DS.textMuted }}>
          <ArrowLeft className="w-4 h-4" /> Back to Programmes
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: DS.text }}>Create Programme</h1>
        <p className="text-sm mt-0.5" style={{ color: DS.textMuted }}>
          Programmes can include learners from any school — no school restriction.
        </p>
      </div>
      <div className="rounded-2xl p-6" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <NewProgramForm instructors={instructors} />
      </div>
    </div>
  );
}
