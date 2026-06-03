import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { fmt } from '@/utils';

export default async function StudentAttendancePage() {
  const user     = await requireAuth(['learner']);
  const supabase = await createClient();

  const { data: learner } = await supabase
    .from('learners')
    .select(`
      attendance(
        attendance_id, status, session_date, notes,
        programs(program_name)
      )
    `)
    .eq('user_id', user.user_id)
    .single();

  const records = ((learner as any)?.attendance || [])
    .sort((a: any, b: any) => b.session_date.localeCompare(a.session_date));

  const total   = records.length;
  const present = records.filter((r: any) => r.status === 'present').length;
  const absent  = records.filter((r: any) => r.status === 'absent').length;
  const late    = records.filter((r: any) => r.status === 'late').length;
  const rate    = total ? Math.round(present / total * 100) : 0;

  const STATUS: Record<string, { color: string; bg: string; emoji: string; label: string }> = {
    present: { color: '#2DD4A0', bg: 'rgba(45,212,160,0.1)',  emoji: '✅', label: 'Present' },
    absent:  { color: '#F87171', bg: 'rgba(248,113,113,0.1)', emoji: '❌', label: 'Absent' },
    late:    { color: '#FCD34D', bg: 'rgba(252,211,77,0.1)',  emoji: '⏰', label: 'Late' },
    excused: { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  emoji: '📋', label: 'Excused' },
  };

  const attColor = rate >= 90 ? '#2DD4A0' : rate >= 75 ? '#60A5FA' : rate >= 60 ? '#FCD34D' : '#F87171';
  const message  = rate >= 90 ? '🌟 Outstanding! Keep it up!'
    : rate >= 75 ? '✅ On track — great work.'
    : rate >= 60 ? '📚 Getting there — aim for 75%.'
    : '⚠️ Attendance needs attention.';

  return (
    <div className="space-y-5 pt-2">
      <div>
        <h1 className="text-2xl font-black text-white">My Attendance 📅</h1>
        <p className="text-sm mt-0.5 text-white/40">{total} sessions recorded</p>
      </div>

      {/* Big ring */}
      <div className="rounded-3xl p-6 relative overflow-hidden"
        style={{ background: `${attColor}15`, border: `1px solid ${attColor}35` }}>
        <div className="flex items-center gap-5">
          {/* SVG ring */}
          <div className="relative shrink-0" style={{ width: 100, height: 100 }}>
            <svg width="100" height="100" className="-rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={attColor} strokeWidth="8"
                strokeDasharray={`${rate / 100 * 2 * Math.PI * 42} ${2 * Math.PI * 42}`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black" style={{ color: attColor }}>{rate}%</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-2xl font-black text-white">{rate}%</p>
            <p className="text-sm text-white/50 mt-0.5">Attendance Rate</p>
            <p className="text-sm mt-2 font-medium" style={{ color: attColor }}>{message}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Present', count: present, ...STATUS.present },
          { label: 'Absent',  count: absent,  ...STATUS.absent },
          { label: 'Late',    count: late,    ...STATUS.late },
          { label: 'Total',   count: total,   color:'#94A3B8', bg:'rgba(148,163,184,0.1)', emoji:'📊', label2:'Total' },
        ].map(({ label, count, color, bg, emoji }) => (
          <div key={label} className="rounded-2xl p-3 text-center"
            style={{ background: bg, border: `1px solid ${color}30` }}>
            <div className="text-xl mb-0.5">{emoji}</div>
            <p className="text-xl font-black" style={{ color }}>{count}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide mt-0.5" style={{ color: color + '80' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Session list */}
      {records.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-3">📅</p>
          <p className="font-bold text-white">No sessions recorded yet</p>
          <p className="text-sm mt-1 text-white/40">Your attendance will appear here</p>
        </div>
      ) : (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3 text-white/40">All Sessions</p>
          <div className="space-y-2">
            {records.map((r: any, i: number) => {
              const cfg = STATUS[r.status] || STATUS.present;
              return (
                <div key={i} className="flex items-center justify-between px-4 py-3 rounded-2xl"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.color}25` }}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{cfg.emoji}</span>
                    <div>
                      <p className="text-sm font-bold text-white">{fmt.date(r.session_date)}</p>
                      <p className="text-xs text-white/40">{(r.programs as any)?.program_name || 'Session'}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: `${cfg.color}20`, color: cfg.color }}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
