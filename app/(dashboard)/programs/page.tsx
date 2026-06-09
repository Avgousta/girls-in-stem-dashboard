import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { fmt } from '@/utils';
import Link from 'next/link';
import { PlusCircle, Users, Calendar, BookOpen, Pencil } from 'lucide-react';
import { DS } from '@/components/platform/tokens';

async function getPrograms() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('programs')
    .select(`
      program_id, program_name, program_type, start_date, end_date,
      max_capacity, is_active, description,
      users!instructor_id(full_name),
      program_enrollments(count)
    `)
    .order('start_date', { ascending: false });
  interface PRow { program_id:string; program_name:string; program_type:string; start_date:string; end_date:string|null; max_capacity:number; is_active:boolean; description:string|null; users:{full_name:string}|null; program_enrollments:Array<{count:number}> }
  return ((data || []) as unknown as PRow[]).map(p => ({
    ...p,
    instructor_name: p.users?.full_name,
    enrolled_count:  p.program_enrollments?.length || 0,
  }));
}

const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  'Coding':            { color: '#5B21B6', bg: 'rgba(91,33,182,0.12)'  },
  'Robotics':          { color: '#1D4ED8', bg: 'rgba(29,78,216,0.12)'  },
  'Coding & Robotics': { color: '#4338CA', bg: 'rgba(67,56,202,0.12)'  },
  'Data Science':      { color: '#7E22CE', bg: 'rgba(126,34,206,0.12)' },
  'Design/Tech':       { color: '#9D174D', bg: 'rgba(157,23,77,0.12)'  },
  'Mathematics':       { color: '#854D0E', bg: 'rgba(133,77,14,0.12)'  },
  'Science':           { color: '#166534', bg: 'rgba(22,101,52,0.12)'  },
  'Math & Science':    { color: '#134E4A', bg: 'rgba(19,78,74,0.12)'   },
  'AI/ML':             { color: '#9A3412', bg: 'rgba(154,52,18,0.12)'  },
  'Electronics':       { color: '#155E75', bg: 'rgba(21,94,117,0.12)'  },
};

function TypeBadge({ type }: { type: string }) {
  const c = TYPE_COLORS[type] || { color: DS.textMid as string, bg: DS.surfaceHover as string };
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.color }}>
      {type}
    </span>
  );
}

export default async function ProgramsPage() {
  const user = await requireAuth(['admin', 'instructor']);
  const programs = await getPrograms();
  const isAdmin = user.role === 'admin';

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: DS.text }}>Programmes</h1>
          <p className="text-sm mt-0.5" style={{ color: DS.textMuted }}>{programs.length} programmes</p>
        </div>
        {isAdmin && (
          <Link href="/programs/new" className="btn-primary">
            <PlusCircle className="w-4 h-4" /> New Programme
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {programs.map(p => (
          <div key={p.program_id}
            className="rounded-2xl p-5 flex flex-col transition-all"
            style={{ background: DS.surface, border: `1px solid ${DS.border}` }}
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: DS.primaryLight }}>
                  <BookOpen className="w-5 h-5" style={{ color: DS.primary }} />
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={p.is_active
                    ? { background: 'var(--ds-success-light)', color: 'var(--ds-success)' }
                    : { background: DS.surfaceHover as string, color: DS.textMuted as string }}>
                  {p.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {isAdmin && (
                <Link
                  href={`/programs/${p.program_id}/edit`}
                  className="shrink-0 p-1.5 rounded-lg transition-colors"
                  style={{ color: DS.textMuted }}
                  title="Edit programme">
                  <Pencil className="w-4 h-4" />
                </Link>
              )}
            </div>

            <Link href={`/programs/${p.program_id}`} className="group flex-1">
              <h3 className="font-semibold mb-2 group-hover:underline" style={{ color: DS.text }}>
                {p.program_name}
              </h3>

              <TypeBadge type={p.program_type} />

              {p.description && (
                <p className="text-xs mt-2 line-clamp-2" style={{ color: DS.textMuted }}>{p.description}</p>
              )}

              <div className="mt-4 pt-4 grid grid-cols-2 gap-2 text-xs" style={{ borderTop: `1px solid ${DS.borderLight}`, color: DS.textMuted }}>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3 h-3" />
                  {p.enrolled_count}/{p.max_capacity} learners
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  {fmt.date(p.start_date)}
                </div>
                {p.instructor_name && (
                  <div className="col-span-2 truncate">👤 {p.instructor_name}</div>
                )}
              </div>
            </Link>
          </div>
        ))}
      </div>

      {programs.length === 0 && (
        <div className="text-center py-16 rounded-2xl" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <BookOpen className="w-12 h-12 mx-auto mb-3" style={{ color: DS.borderLight }} />
          <h3 className="text-base font-semibold" style={{ color: DS.text }}>No programmes yet</h3>
          <p className="text-sm mt-1" style={{ color: DS.textMuted }}>Create your first STEM programme to get started.</p>
          {isAdmin && (
            <Link href="/programs/new" className="btn-primary mt-4 inline-flex">
              <PlusCircle className="w-4 h-4" /> New Programme
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
