'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTheme } from '../StudentThemeProvider';
import type { StreakData, Challenge } from '@/lib/gamification/engine';
import PulseCheckIn from '@/components/student/PulseCheckIn';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface LearnerData {
  learner_id: string;
  learner_code: string;
  grade: number;
  schools: { school_name: string } | null;
  learner_profiles: { first_name: string; last_name: string; aspiration?: string | null; bio?: string | null; cover_color?: string | null } | null;
  attendance: Array<{ status: string; session_date: string }>;
  assessments: Array<{ percentage: number | null; grade_band: string | null; subject: string; assessment_date: string | null }>;
  projects: Array<{ project_id: string; project_name: string; stage: string | null; completion_status: string; due_date: string | null }>;
  program_enrollments: Array<{ status: string; programs: { program_name: string; program_type: string } | null }>;
}
export interface Meeting { meeting_id: string; title: string; scheduled_at: string; platform: string; meeting_url: string }

interface Props {
  learner:   LearnerData | null;
  meetings:  Meeting[];
  streak:    StreakData;
  totalXP:   number;
  levelData: { level: number; currentXP: number; neededXP: number; pct: number };
  challenges: Challenge[];
  pulse:     { learnerId: string; alreadySubmitted: boolean; existingRating: number | null };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function scoreColor(v: number) { return v >= 75 ? '#2DD4A0' : v >= 50 ? '#FCD34D' : '#F87171'; }

// Animated XP bar with shimmer sweep
function XPBar({ pct, color }: { pct: number; color: string }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), 500); return () => clearTimeout(t); }, [pct]);
  return (
    <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.10)' }}>
      <div style={{
        width: `${w}%`, height: '100%', borderRadius: 9999,
        background: `linear-gradient(90deg,${color}dd,${color})`,
        transition: 'width 1.4s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: `0 0 12px ${color}50`,
        position: 'relative', overflow: 'hidden',
      }}>
        <span style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)',
          animation: 'xpShimmer 2.8s infinite',
        }} />
      </div>
      <style>{`@keyframes xpShimmer{0%{transform:translateX(-200%)}100%{transform:translateX(400%)}}`}</style>
    </div>
  );
}

// Smooth count-up
function Count({ to, duration = 900 }: { to: number; duration?: number }) {
  const [v, setV] = useState(0);
  const f = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const tick  = (now: number) => {
      const t    = Math.min((now - start) / duration, 1);
      const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
      setV(Math.round(ease * to));
      if (t < 1) f.current = requestAnimationFrame(tick);
    };
    f.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(f.current);
  }, [to, duration]);
  return <>{v}</>;
}

// Mini animated progress ring
function MiniRing({ pct, color, size = 52 }: { pct: number; color: string; size?: number }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => { const t = setTimeout(() => setAnimated(pct), 400); return () => clearTimeout(t); }, [pct]);
  const r    = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (animated / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90" style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.34,1.56,0.64,1)' }} />
    </svg>
  );
}

// Stat pill — used in the top grid
function StatPill({ emoji, value, label, href, color, warn }: {
  emoji: string; value: string | number; label: string; href: string; color: string; warn?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <Link href={href}
      className="rounded-2xl p-3.5 flex flex-col gap-1.5 relative overflow-hidden active:scale-95 md:hover:scale-[1.02] transition-transform"
      style={{ background: `${color}13`, border: `1px solid ${color}30` }}>
      {warn && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-400 animate-pulse" />}
      <span className="text-xl leading-none">{emoji}</span>
      <p className="text-2xl font-black tabular-nums leading-none" style={{ color }}>{value}</p>
      <p className="text-[11px] font-semibold" style={{ color: `${color}80` }}>{label}</p>
    </Link>
  );
}

// Section header
function SectionHeader({ icon, title, action }: { icon: string; title: string; action?: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-base leading-none">{icon}</span>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>{title}</p>
      </div>
      {action}
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function StudentDashboardClient({ learner, meetings, streak, totalXP, levelData, challenges, pulse }: Props) {
  const { theme, accentColor } = useTheme();

  if (!learner) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-6xl mb-4">😕</p>
      <p className="text-lg font-bold" style={{ color: theme.textPrimary }}>Profile not linked</p>
      <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Contact your teacher to get set up.</p>
    </div>
  );

  const profile     = learner.learner_profiles;
  const attendance  = learner.attendance  || [];
  const assessments = learner.assessments || [];
  const projects    = learner.projects    || [];
  const programmes  = (learner.program_enrollments || []).filter(e => e.status === 'active');

  const attRate   = attendance.length ? Math.round(attendance.filter(a => a.status === 'present').length / attendance.length * 100) : 0;
  const avgScore  = assessments.length ? Math.round(assessments.reduce((s, a) => s + Number(a.percentage || 0), 0) / assessments.length) : 0;
  const doneProj  = projects.filter(p => ['marked','completed'].includes(p.stage || p.completion_status || '')).length;
  const activeProj= projects.filter(p => !['marked','completed'].includes(p.stage || p.completion_status || '')).length;

  const firstName  = profile?.first_name || 'Learner';
  const coverColor = profile?.cover_color || accentColor;
  const hour       = new Date().getHours();
  const greeting   = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const recentAss = [...assessments]
    .sort((a, b) => (b.assessment_date||'').localeCompare(a.assessment_date||''))
    .slice(0, 3);

  // Next steps (smart priority queue)
  const steps: Array<{ icon:string; title:string; sub:string; href:string; accent:string; pri:number }> = [];
  const overdue = projects.filter(p => p.due_date && new Date(p.due_date) < new Date() && !['marked','completed'].includes(p.stage||p.completion_status||''));
  if (overdue.length > 0)  steps.push({ icon:'⚠️', title:'Overdue project',    sub: overdue[0].project_name,       href:'/student/projects',   accent:'#F87171', pri:0 });
  if (meetings.length > 0) {
    const m    = meetings[0];
    const when = new Date(m.scheduled_at);
    const diff = Math.round((when.getTime() - Date.now()) / 60000);
    const isToday = when.toDateString() === new Date().toDateString();
    steps.push({ icon:'🎥', title: isToday && diff <= 60 ? 'Class today — join now!' : isToday ? 'Class later today' : 'Upcoming class', sub:`${m.title}`, href:'/student/meetings', accent:'#34D399', pri: diff <= 0 ? -1 : isToday ? 1 : 4 });
  }
  if (activeProj > 0)     steps.push({ icon:'📁', title:'Continue your project', sub:`${activeProj} in progress`,    href:'/student/projects',   accent:'#A78BFA', pri:2 });
  if (attRate < 75)        steps.push({ icon:'📅', title:'Improve attendance',    sub:`${attRate}% — aim for 75%+`,   href:'/student/attendance', accent:'#FCD34D', pri:3 });
  if (!profile?.bio)       steps.push({ icon:'✏️', title:'Set up your profile',   sub:'Add your bio and interests',  href:'/student/profile',    accent:accentColor, pri:6 });
  steps.sort((a, b) => a.pri - b.pri);

  // Live class check
  const liveClass = meetings.length > 0 ? (() => {
    const m    = meetings[0];
    const diff = Math.round((new Date(m.scheduled_at).getTime() - Date.now()) / 60000);
    if (diff > 60 || diff < -60) return null;
    return { ...m, diff };
  })() : null;

  const card: React.CSSProperties = {
    background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 20,
  };

  const PROG_ICONS: Record<string, string> = {
    STEM:'🔬',Coding:'💻',Robotics:'🤖',Mathematics:'📐',Science:'🧪','After-School':'📚',Hybrid:'🌐',Design:'🎨',
  };

  const GRADE_COLORS: Record<string, string> = {
    'Distinction':'#2DD4A0','Merit':'#60A5FA','Pass':'#FCD34D','Needs Support':'#F87171',
  };

  // ─── Shared section blocks (used in both mobile & desktop layouts) ──────────
  const HeroCard = (
    <div className="relative rounded-3xl overflow-hidden"
      style={{ background: `linear-gradient(135deg,${coverColor}ee 0%,${coverColor}55 60%,rgba(0,0,0,0.1) 100%)` }}>
      <div className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage:'radial-gradient(circle,white 1.5px,transparent 1.5px)', backgroundSize:'22px 22px' }} />
      <div className="relative p-5">
        {/* Name + Level in flex row — no overlap possible */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-white/55 text-xs font-semibold mb-0.5">{greeting},</p>
            <h1 className="text-2xl font-black text-white leading-tight truncate">{firstName}</h1>
            {profile?.aspiration && (
              <p className="text-white/55 text-sm mt-1.5">🎯 Future {profile.aspiration}</p>
            )}
            <p className="text-white/35 text-xs mt-1">{learner.schools?.school_name} · Grade {learner.grade}</p>
          </div>
          <div className="shrink-0 rounded-2xl px-3 py-2.5 text-center backdrop-blur-md"
            style={{ background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(255,255,255,0.15)', minWidth: 60 }}>
            <p className="text-[9px] text-white/45 font-black uppercase tracking-widest leading-none">LEVEL</p>
            <p className="text-3xl font-black text-white leading-none mt-1"><Count to={levelData.level} /></p>
            {streak.current >= 3 && (
              <p className="text-[10px] font-black mt-1" style={{ color: '#F97316' }}>🔥{streak.current}</p>
            )}
          </div>
        </div>
        {/* XP bar */}
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-white/50 font-medium"><Count to={totalXP} /> XP total</span>
            <span className="text-white/35">{levelData.currentXP}/{levelData.neededXP} → Lv {levelData.level + 1}</span>
          </div>
          <XPBar pct={levelData.pct} color="rgba(255,255,255,0.9)" />
        </div>
      </div>
    </div>
  );

  const StatsGrid = (
    <div className="grid grid-cols-3 gap-3">
      <StatPill emoji="📅" value={`${attRate}%`} label="Attendance" href="/student/attendance"
        color={attRate >= 75 ? '#2DD4A0' : '#F87171'} warn={attRate < 75} />
      <StatPill emoji="⭐" value={`${avgScore}%`} label="Avg Score" href="/student/progress"
        color={scoreColor(avgScore)} />
      <StatPill emoji="🚀" value={doneProj} label="Projects Done" href="/student/projects"
        color="#A78BFA" />
    </div>
  );

  const LiveBanner = liveClass ? (
    <a href={liveClass.meeting_url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl p-4 active:scale-[0.99] md:hover:scale-[1.01] transition-transform"
      style={{ background: liveClass.diff <= 0 ? 'rgba(52,211,153,0.18)' : 'rgba(52,211,153,0.10)', border:`1px solid ${liveClass.diff<=0?'rgba(52,211,153,0.5)':'rgba(52,211,153,0.25)'}` }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'rgba(52,211,153,0.2)' }}>
        <span className="text-2xl">{liveClass.diff <= 0 ? '🔴' : '🎥'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black truncate" style={{ color: theme.textPrimary }}>
          {liveClass.diff <= 0 ? 'Class is LIVE now!' : `Class starts in ${liveClass.diff}m`}
        </p>
        <p className="text-xs truncate" style={{ color: '#34D399' }}>{liveClass.title}</p>
      </div>
      <span className="text-sm font-black text-white px-4 py-2 rounded-xl shrink-0"
        style={{ background: '#34D399' }}>
        {liveClass.diff <= 0 ? 'Join →' : 'Ready'}
      </span>
    </a>
  ) : null;

  const NextSteps = steps.length > 0 ? (
    <div>
      <SectionHeader icon="📌" title="What to do next" />
      <div className="space-y-2">
        {steps.slice(0, 3).map((s, i) => (
          <Link key={i} href={s.href}
            className="flex items-center gap-3 rounded-2xl px-4 py-3.5 active:scale-[0.99] md:hover:scale-[1.005] transition-transform"
            style={{ background: `${s.accent}12`, border: `1px solid ${s.accent}28` }}>
            <span className="text-xl shrink-0">{s.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: theme.textPrimary }}>{s.title}</p>
              <p className="text-xs mt-0.5 truncate" style={{ color: theme.textMuted }}>{s.sub}</p>
            </div>
            <span className="text-sm font-bold shrink-0" style={{ color: s.accent }}>→</span>
          </Link>
        ))}
      </div>
    </div>
  ) : null;

  const StreakCard = (streak.current > 0 || streak.longest > 0) ? (
    <div style={card} className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🔥</span>
          <div>
            <p className="text-sm font-black" style={{ color: theme.textPrimary }}>Attendance Streak</p>
            <p className="text-xs" style={{ color: theme.textMuted }}>Best ever: {streak.longest} sessions</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-black tabular-nums leading-none" style={{ color: streak.isActive ? '#F97316' : theme.textMuted }}>
            {streak.current}
          </p>
          <p className="text-[10px] font-bold mt-0.5" style={{ color: streak.isActive ? '#F97316' : theme.textMuted }}>
            {streak.isActive && streak.current > 0 ? '🔥 ACTIVE' : 'sessions'}
          </p>
        </div>
      </div>
      <div className="flex gap-1.5">
        {streak.weekDots.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-xl flex items-center justify-center text-xs font-bold transition-all"
              style={{
                aspectRatio: '1/1',
                background:  d.present ? '#F97316' : d.hasSessions ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                border:      `1.5px solid ${d.present ? '#F97316' : 'rgba(255,255,255,0.08)'}`,
                color:       d.present ? 'white' : theme.textMuted,
                boxShadow:   d.present ? '0 0 10px rgba(249,115,22,0.5)' : 'none',
              }}>
              {d.present ? '✓' : d.hasSessions ? '✗' : '·'}
            </div>
            <span className="text-[9px] font-semibold" style={{ color: theme.textMuted }}>{d.date}</span>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  const ChallengesCard = challenges.length > 0 ? (
    <div>
      <SectionHeader icon="🎯" title="Active Challenges"
        action={
          <Link href="/student/achievements" className="text-xs font-bold" style={{ color: accentColor }}>
            All badges →
          </Link>
        }
      />
      <div className="space-y-2.5">
        {challenges.map(ch => (
          <div key={ch.id} style={card} className="p-4">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{ch.icon}</span>
                <p className="text-sm font-bold" style={{ color: theme.textPrimary }}>{ch.title}</p>
              </div>
              <span className="text-xs font-black px-2 py-0.5 rounded-full"
                style={{ background: `${ch.color}20`, color: ch.color }}>+{ch.xpReward} XP</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span style={{ color: theme.textMuted }}>{ch.current}/{ch.target} {ch.unit}</span>
                <span className="font-bold" style={{ color: ch.color }}>{ch.progress}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${ch.progress}%`, background: ch.color, boxShadow: `0 0 8px ${ch.color}50` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  const RecentResults = recentAss.length > 0 ? (
    <div>
      <SectionHeader icon="📊" title="Recent Results"
        action={
          <Link href="/student/progress" className="text-xs font-bold" style={{ color: accentColor }}>
            See all →
          </Link>
        }
      />
      <div className="space-y-2">
        {recentAss.map((a, i) => {
          const pct   = Number(a.percentage || 0);
          const color = scoreColor(pct);
          const gc    = GRADE_COLORS[a.grade_band ?? ''] || color;
          return (
            <div key={i} className="flex items-center justify-between px-4 py-3 rounded-2xl"
              style={{ background: `${color}10`, border: `1px solid ${color}22` }}>
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <MiniRing pct={pct} color={color} size={40} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-black" style={{ color }}>{pct}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: theme.textPrimary }}>{a.subject}</p>
                  {a.grade_band && (
                    <span className="text-[10px] font-bold" style={{ color: gc }}>{a.grade_band}</span>
                  )}
                </div>
              </div>
              <p className="text-xl font-black tabular-nums shrink-0" style={{ color }}>{pct}%</p>
            </div>
          );
        })}
      </div>
    </div>
  ) : null;

  const ProgrammesCard = programmes.length > 0 ? (
    <div>
      <SectionHeader icon="📚" title="My Programmes" />
      <div className="space-y-2">
        {programmes.map((e, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl px-4 py-3" style={card}>
            <span className="text-xl shrink-0">{PROG_ICONS[e.programs?.program_type ?? ''] || '📚'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: theme.textPrimary }}>
                {e.programs?.program_name}
              </p>
              <p className="text-xs" style={{ color: theme.textMuted }}>{e.programs?.program_type}</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
              style={{ background: `${accentColor}20`, color: accentColor }}>
              Active
            </span>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  const UpcomingClasses = meetings.length > 0 ? (
    <div>
      <SectionHeader icon="🗓️" title="Upcoming Classes" />
      <div className="space-y-2">
        {meetings.map((m, i) => {
          const when    = new Date(m.scheduled_at);
          const isToday = when.toDateString() === new Date().toDateString();
          const PLAT: Record<string, string> = { zoom:'🎥', meet:'🟢', teams:'💼', other:'🔗' };
          return (
            <div key={i} className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{
                background: isToday ? 'rgba(52,211,153,0.12)' : theme.cardBg,
                border:     `1px solid ${isToday ? 'rgba(52,211,153,0.3)' : theme.cardBorder}`,
              }}>
              <span className="text-xl shrink-0">{PLAT[m.platform] || '🎥'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: theme.textPrimary }}>{m.title}</p>
                <p className="text-xs" style={{ color: theme.textMuted }}>
                  {isToday ? 'Today' : when.toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short'})}
                  {' · '}
                  {when.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})}
                </p>
              </div>
              {isToday && (
                <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: '#34D399' }}>TODAY</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  ) : null;

  // ─── DESKTOP LAYOUT (md+): 2 columns ────────────────────────────────────────
  const DesktopLayout = (
    <div className="space-y-6">
      {/* Row 1: Hero full width */}
      {HeroCard}

      {/* Row 2: Stats + Live banner */}
      <div className="grid grid-cols-3 gap-4">
        {/* Left 2/3: stats */}
        <div className="col-span-2 space-y-4">
          {StatsGrid}
          {LiveBanner}
          {NextSteps}
        </div>
        {/* Right 1/3: streak + upcoming */}
        <div className="space-y-4">
          {StreakCard}
          {UpcomingClasses}
        </div>
      </div>

      {/* Row 3: Programmes + Challenges + Results */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 space-y-4">
          {ProgrammesCard}
        </div>
        <div className="col-span-1 space-y-4">
          {ChallengesCard}
        </div>
        <div className="col-span-1 space-y-4">
          {RecentResults}
        </div>
      </div>

      {/* Row 4: Weekly pulse check-in */}
      <PulseCheckIn
        learnerId={pulse.learnerId}
        alreadySubmitted={pulse.alreadySubmitted}
        existingRating={pulse.existingRating}
      />
    </div>
  );

  // ─── MOBILE LAYOUT (< md): single column with priority ordering ─────────────
  const MobileLayout = (
    <div className="space-y-5">
      {HeroCard}
      {StatsGrid}
      {LiveBanner}
      {NextSteps}
      <PulseCheckIn
        learnerId={pulse.learnerId}
        alreadySubmitted={pulse.alreadySubmitted}
        existingRating={pulse.existingRating}
      />
      {StreakCard}
      {ChallengesCard}
      {RecentResults}
      {UpcomingClasses}
      {ProgrammesCard}
    </div>
  );

  return (
    <>
      {/* Desktop: shown on md+ */}
      <div className="hidden md:block">{DesktopLayout}</div>
      {/* Mobile: shown below md */}
      <div className="md:hidden">{MobileLayout}</div>
    </>
  );
}
