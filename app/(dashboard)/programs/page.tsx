import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { fmt } from '@/utils';
import Link from 'next/link';
import { PlusCircle, Users, Calendar, BookOpen, Pencil } from 'lucide-react';

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
  return (data || []).map((p: any) => ({
    ...p,
    instructor_name: p.users?.full_name,
    enrolled_count:  p.program_enrollments?.length || 0,
  }));
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  'Coding':            { bg: '#EDE9FE', text: '#5B21B6' },
  'Robotics':          { bg: '#DBEAFE', text: '#1D4ED8' },
  'Coding & Robotics': { bg: '#E0E7FF', text: '#4338CA' },
  'Data Science':      { bg: '#F3E8FF', text: '#7E22CE' },
  'Design/Tech':       { bg: '#FCE7F3', text: '#9D174D' },
  'Mathematics':       { bg: '#FEF9C3', text: '#854D0E' },
  'Science':           { bg: '#DCFCE7', text: '#166534' },
  'Math & Science':    { bg: '#CCFBF1', text: '#134E4A' },
  'AI/ML':             { bg: '#FFEDD5', text: '#9A3412' },
  'Electronics':       { bg: '#CFFAFE', text: '#155E75' },
};

function TypeBadge({ type }: { type: string }) {
  const colors = TYPE_COLORS[type] || { bg: '#F3F4F6', text: '#374151' };
  return (
    <span className="badge" style={{ background: colors.bg, color: colors.text }}>
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
          <h1 className="text-2xl font-bold text-gray-900">Programmes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{programs.length} programmes</p>
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
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col">

            {/* Header row */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand-800/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-brand-700" />
                </div>
                <span className={`badge ${p.is_active ? 'bg-mint-400/10 text-mint-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Edit button — admin only */}
              {isAdmin && (
                <Link
                  href={`/programs/${p.program_id}/edit`}
                  className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-brand-700 hover:bg-brand-50 transition-colors"
                  title="Edit programme">
                  <Pencil className="w-4 h-4" />
                </Link>
              )}
            </div>

            {/* Name — links to detail page */}
            <Link href={`/programs/${p.program_id}`} className="group flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors mb-2">
                {p.program_name}
              </h3>

              <TypeBadge type={p.program_type} />

              {p.description && (
                <p className="text-xs text-gray-400 mt-2 line-clamp-2">{p.description}</p>
              )}

              {/* Meta */}
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs text-gray-500">
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
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-800">No programmes yet</h3>
          <p className="text-sm text-gray-400 mt-1">Create your first STEM programme to get started.</p>
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
