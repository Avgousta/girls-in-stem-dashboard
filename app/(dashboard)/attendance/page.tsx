import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import AttendanceForm from '@/components/forms/AttendanceForm';
import AttendanceHistory from './AttendanceHistory';
import Link from 'next/link';
import { CalendarCheck2, History } from 'lucide-react';

async function getPrograms() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('programs')
    .select('program_id, program_name')
    .eq('is_active', true)
    .order('program_name');
  return data || [];
}

interface Props {
  searchParams: Promise<{ tab?: string; program?: string; from?: string; to?: string }>;
}

export default async function AttendancePage({ searchParams }: Props) {
  const user    = await requireAuth(['admin', 'instructor']);
  const params  = await searchParams;
  const tab     = params.tab || 'mark';
  const programs = await getPrograms();

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-sm text-gray-500 mt-0.5">Mark sessions or view attendance history and reports</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <Link href="/attendance?tab=mark"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'mark'
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}>
          <CalendarCheck2 className="w-4 h-4" /> Mark Attendance
        </Link>
        <Link href="/attendance?tab=history"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'history'
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}>
          <History className="w-4 h-4" /> View History
        </Link>
      </div>

      {tab === 'mark' ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <AttendanceForm programs={programs} currentUserId={user.user_id} />
        </div>
      ) : (
        <AttendanceHistory programs={programs} initialProgram={params.program} initialFrom={params.from} initialTo={params.to} />
      )}
    </div>
  );
}
