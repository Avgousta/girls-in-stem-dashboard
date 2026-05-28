// Shared mentorship badge + display components
export const SESSION_TYPE_CFG: Record<string, { icon:string; label:string; color:string }> = {
  check_in:         { icon:'💬', label:'Check-in',        color:'#1D4ED8' },
  goal_review:      { icon:'🎯', label:'Goal Review',     color:'#7C3AED' },
  academic_support: { icon:'📚', label:'Academic Support',color:'#0891B2' },
  career:           { icon:'🚀', label:'Career',          color:'#DB2777' },
  pastoral:         { icon:'💛', label:'Pastoral',        color:'#D97706' },
  other:            { icon:'📋', label:'Other',           color:'#64748B' },
};

export const OUTCOME_CFG: Record<string, { label:string; color:string; bg:string; dot:string }> = {
  positive:        { label:'Positive',       color:'#16A34A', bg:'#F0FDF4', dot:'#22C55E' },
  neutral:         { label:'Neutral',        color:'#6B7280', bg:'#F9FAFB', dot:'#9CA3AF' },
  needs_follow_up: { label:'Needs Follow-up',color:'#D97706', bg:'#FFFBEB', dot:'#F59E0B' },
};

export const MOOD_EMOJI  = ['', '😟', '😕', '😐', '😊', '😄'];
export const MOOD_LABEL  = ['', 'Struggling', 'Low', 'Neutral', 'Good', 'Great'];

export const GOAL_STATUS: Record<string, { label:string; color:string; bg:string }> = {
  active:    { label:'Active',    color:'#1D4ED8', bg:'#EFF6FF' },
  completed: { label:'Completed', color:'#16A34A', bg:'#F0FDF4' },
  paused:    { label:'Paused',    color:'#D97706', bg:'#FFFBEB' },
  abandoned: { label:'Abandoned', color:'#6B7280', bg:'#F9FAFB' },
};

export function SessionTypeBadge({ type }: { type: string }) {
  const c = SESSION_TYPE_CFG[type] ?? SESSION_TYPE_CFG.other;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: `${c.color}15`, color: c.color }}>
      {c.icon} {c.label}
    </span>
  );
}

export function OutcomeBadge({ outcome }: { outcome: string | null }) {
  if (!outcome) return null;
  const c = OUTCOME_CFG[outcome] ?? OUTCOME_CFG.neutral;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {c.label}
    </span>
  );
}

export function GoalStatusBadge({ status }: { status: string }) {
  const c = GOAL_STATUS[status] ?? GOAL_STATUS.active;
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

export function MoodDisplay({ mood, size = 'sm' }: { mood: number | null; size?: 'sm' | 'lg' }) {
  if (!mood) return <span className="text-gray-300">—</span>;
  return (
    <span className={`${size === 'lg' ? 'text-2xl' : 'text-base'}`}
      title={`${MOOD_LABEL[mood]} (${mood}/5)`}>
      {MOOD_EMOJI[mood]}
    </span>
  );
}

// Learner-facing session card (simpler, encouraging)
export function LearnerSessionSummary({
  type, date, mentorName, outcome, mood, nextSteps,
}: {
  type: string; date: string; mentorName: string;
  outcome: string | null; mood: number | null; nextSteps: string;
}) {
  const tc = SESSION_TYPE_CFG[type] ?? SESSION_TYPE_CFG.other;
  return (
    <div className="rounded-2xl border border-gray-100 shadow-sm bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: `${tc.color}12` }}>
          {tc.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-gray-800">{tc.label} Session</p>
            <OutcomeBadge outcome={outcome} />
            {mood && <span title={MOOD_LABEL[mood]}>{MOOD_EMOJI[mood]}</span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(date).toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric' })}
            {' · '}with {mentorName}
          </p>
        </div>
      </div>
      {nextSteps && (
        <div className="px-4 pb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Your Next Steps</p>
          <p className="text-sm text-gray-700 leading-relaxed">{nextSteps}</p>
        </div>
      )}
    </div>
  );
}

// Goal progress card for learner view
export function LearnerGoalCard({
  title, desc, due, status,
}: {
  title: string; desc: string; due: string | null; status: string;
}) {
  const sc      = GOAL_STATUS[status] ?? GOAL_STATUS.active;
  const overdue = status === 'active' && due && due < new Date().toISOString().slice(0, 10);
  const done    = status === 'completed';
  return (
    <div className={`rounded-2xl border p-4 flex items-start gap-3
      ${done ? 'bg-green-50/30 border-green-200/50' : overdue ? 'bg-red-50/20 border-red-200' : 'bg-white border-gray-100 shadow-sm'}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0
        ${done ? 'bg-green-100' : 'bg-blue-50'}`}>
        {done ? '✅' : '🎯'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-gray-800">{title}</p>
          <GoalStatusBadge status={status} />
          {overdue && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">⏰ Overdue</span>}
        </div>
        {desc && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>}
        {due  && <p className="text-xs text-gray-400 mt-1">Target: {new Date(due).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'})}</p>}
      </div>
    </div>
  );
}
