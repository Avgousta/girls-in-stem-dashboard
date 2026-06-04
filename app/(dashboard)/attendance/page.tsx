import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import AttendanceForm from '@/components/forms/AttendanceForm';
import AttendanceHistory from './AttendanceHistory';
import Link from 'next/link';
import { CalendarCheck2, History } from 'lucide-react';
import { DS } from '@/components/platform/tokens';

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
  const user     = await requireAuth(['admin', 'instructor']);
  const params   = await searchParams;
  const tab      = params.tab || 'mark';
  const programs = await getPrograms();

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--ds-text)' }}>
          <CalendarCheck2 className="w-6 h-6" style={{ color: 'var(--ds-purple)' }} />
          Attendance
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>
          Mark sessions or view attendance history and reports
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: DS.surfaceHover }}>
        {[
          { key: 'mark',    label: 'Mark Attendance', icon: CalendarCheck2 },
          { key: 'history', label: 'View History',    icon: History        },
        ].map(({ key, label, icon: Icon }) => (
          <Link key={key} href={`/attendance?tab=${key}`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={tab === key
              ? { background: DS.primary, color: '#fff' }
              : { background: 'transparent', color: DS.textMid as string }}>
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </div>

      {tab === 'mark' ? (
        <div className="rounded-2xl p-6" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <AttendanceForm programs={programs} currentUserId={user.user_id} />
        </div>
      ) : (
        <AttendanceHistory
          programs={programs}
          initialProgram={params.program}
          initialFrom={params.from}
          initialTo={params.to}
        />
      )}
    </div>
  );
}
