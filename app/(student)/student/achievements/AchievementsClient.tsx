'use client';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../StudentThemeProvider';
import type { StreakData, Challenge } from '@/lib/gamification/engine';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Stats {
  attRate: number; avgScore: number; doneProj: number;
  distinctions: number; presStreak: number; totalAss: number; mentorship: number;
}
interface LevelData { level: number; currentXP: number; neededXP: number; pct: number }
interface Badge {
  id: string; icon: string; name: string; desc: string;
  earned: boolean; color: string; rarity: 'Common'|'Rare'|'Epic'|'Legendary'; xp: number;
}
interface Props {
  stats: Stats; streak: StreakData;
  totalXP: number; levelData: LevelData; challenges: Challenge[];
}

// ─── Badge definitions ───────────────────────────────────────────────────────
function buildBadges(s: Stats, streak: number): Badge[] {
  return [
    { id:'first_step',   icon:'👣', name:'First Step',        desc:'Attended your first session',        earned: s.presStreak>=1,    color:'#60A5FA', rarity:'Common',    xp:15 },
    { id:'regular',      icon:'📅', name:'Regular',           desc:'Attended 10 sessions',               earned: s.presStreak>=10,   color:'#60A5FA', rarity:'Common',    xp:50 },
    { id:'streak_3',     icon:'⚡', name:'On Fire',           desc:'3 sessions in a row',                earned: streak>=3,          color:'#F97316', rarity:'Common',    xp:25 },
    { id:'streak_5',     icon:'🔥', name:'Streak Master',     desc:'5 consecutive sessions',             earned: streak>=5,          color:'#F97316', rarity:'Rare',      xp:50 },
    { id:'streak_10',    icon:'💥', name:'Unstoppable',       desc:'10 sessions in a row',               earned: streak>=10,         color:'#EF4444', rarity:'Epic',      xp:100 },
    { id:'att_hero',     icon:'🏅', name:'Attendance Hero',   desc:'90%+ attendance rate',               earned: s.attRate>=90,      color:'#2DD4A0', rarity:'Rare',      xp:75 },
    { id:'perfect_att',  icon:'💯', name:'Perfect',           desc:'100% attendance',                    earned: s.attRate>=100,     color:'#FCD34D', rarity:'Legendary', xp:200 },
    { id:'first_test',   icon:'📝', name:'Test Taker',        desc:'Completed your first assessment',    earned: s.totalAss>=1,      color:'#A78BFA', rarity:'Common',    xp:10 },
    { id:'passing',      icon:'✅', name:'Passing Grade',     desc:'Scored 50% or higher overall',       earned: s.avgScore>=50,     color:'#34D399', rarity:'Common',    xp:20 },
    { id:'honour_roll',  icon:'🌟', name:'Honour Roll',       desc:'Maintained 75%+ average',            earned: s.avgScore>=75,     color:'#FCD34D', rarity:'Rare',      xp:100 },
    { id:'distinction',  icon:'🏆', name:'Distinction',       desc:'Achieved a Distinction grade',       earned: s.distinctions>=1,  color:'#F59E0B', rarity:'Rare',      xp:50 },
    { id:'scholar',      icon:'🎓', name:'Scholar',           desc:'Three or more Distinctions',         earned: s.distinctions>=3,  color:'#EC4899', rarity:'Epic',      xp:200 },
    { id:'builder',      icon:'🔨', name:'Builder',           desc:'Completed your first project',       earned: s.doneProj>=1,      color:'#F97316', rarity:'Common',    xp:75 },
    { id:'creator',      icon:'🚀', name:'Creator',           desc:'Completed 3 projects',               earned: s.doneProj>=3,      color:'#F97316', rarity:'Rare',      xp:150 },
    { id:'mentee',       icon:'💬', name:'Mentee',            desc:'Had a mentorship session',           earned: s.mentorship>=1,    color:'#8B5CF6', rarity:'Common',    xp:20 },
    { id:'champion',     icon:'👑', name:'Champion',          desc:'75%+ attendance AND academics',      earned: s.attRate>=75&&s.avgScore>=75, color:'#FCD34D', rarity:'Legendary', xp:500 },
  ];
}

const RARITY: Record<string, { color: string; bg: string; glow: string }> = {
  Common:    { color: '#94A3B8', bg: 'rgba(148,163,184,0.08)', glow: 'rgba(148,163,184,0.2)' },
  Rare:      { color: '#60A5FA', bg: 'rgba(96,165,250,0.10)',  glow: 'rgba(96,165,250,0.25)' },
  Epic:      { color: '#A78BFA', bg: 'rgba(167,139,250,0.10)', glow: 'rgba(167,139,250,0.30)' },
  Legendary: { color: '#FCD34D', bg: 'rgba(252,211,77,0.12)',  glow: 'rgba(252,211,77,0.40)' },
};

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimCount({ to, duration = 800 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const frame         = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const tick  = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setVal(Math.round(t * t * (3 - 2 * t) * to)); // smooth-step
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [to, duration]);
  return <>{val}</>;
}

// ─── Animated XP bar ──────────────────────────────────────────────────────────
function XPBar({ pct, color }: { pct: number; color: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 300);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
      <div className="h-full rounded-full relative overflow-hidden"
        style={{
          width:      `${width}%`,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          transition: 'width 1.2s cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow:  `0 0 12px ${color}60`,
        }}>
        {/* Shimmer */}
        <div className="absolute inset-0 -skew-x-12"
          style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)',
                   animation: 'shimmer 2s infinite' }} />
      </div>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%) skewX(-12deg)}100%{transform:translateX(400%) skewX(-12deg)}}`}</style>
    </div>
  );
}

// ─── Challenge card ───────────────────────────────────────────────────────────
function ChallengeCard({ ch }: { ch: Challenge }) {
  const { theme } = useTheme();
  const [width, setWidth] = useState(0);
  useEffect(() => { const t = setTimeout(() => setWidth(ch.progress), 400); return () => clearTimeout(t); }, [ch.progress]);

  return (
    <div className="rounded-2xl p-4 transition-all"
      style={{
        background: ch.done ? `${ch.color}12` : theme.cardBg,
        border:     `1px solid ${ch.done ? ch.color + '40' : theme.cardBorder}`,
        opacity:    ch.done ? 0.75 : 1,
      }}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{ch.icon}</span>
          <div>
            <p className="text-sm font-black" style={{ color: ch.done ? ch.color : theme.textPrimary }}>
              {ch.title}
              {ch.done && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: `${ch.color}25`, color: ch.color }}>✓ Done</span>}
            </p>
            <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{ch.desc}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-black" style={{ color: ch.color }}>+{ch.xpReward} XP</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px]">
          <span style={{ color: theme.textMuted }}>{ch.current} / {ch.target} {ch.unit}</span>
          <span className="font-bold" style={{ color: ch.color }}>{ch.progress}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full relative"
            style={{
              width: `${width}%`, background: ch.color,
              transition: 'width 1s cubic-bezier(0.34,1.56,0.64,1)',
              boxShadow: `0 0 8px ${ch.color}50`,
            }} />
        </div>
      </div>
    </div>
  );
}

// ─── Streak dots ──────────────────────────────────────────────────────────────
function StreakDots({ weekDots, accentColor }: { weekDots: StreakData['weekDots']; accentColor: string }) {
  const { theme } = useTheme();
  return (
    <div className="flex gap-1 justify-center">
      {weekDots.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{
              background:  d.present ? accentColor : d.hasSessions ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
              border:      `1px solid ${d.present ? accentColor : 'rgba(255,255,255,0.08)'}`,
              boxShadow:   d.present ? `0 0 10px ${accentColor}60` : 'none',
            }}>
            {d.present ? '✓' : d.hasSessions ? '✗' : '·'}
          </div>
          <span className="text-[9px] font-bold" style={{ color: theme.textMuted }}>{d.date}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Badge card ───────────────────────────────────────────────────────────────
function BadgeCard({ badge }: { badge: Badge }) {
  const { theme } = useTheme();
  const rc = RARITY[badge.rarity];
  return (
    <div className="rounded-2xl p-4 flex flex-col items-center gap-2 text-center transition-all duration-300"
      style={{
        background:  badge.earned ? rc.bg : theme.cardBg,
        border:      `1px solid ${badge.earned ? badge.color + '35' : theme.cardBorder}`,
        boxShadow:   badge.earned ? `0 4px 20px ${rc.glow}` : 'none',
        opacity:     badge.earned ? 1 : 0.45,
        filter:      badge.earned ? 'none' : 'grayscale(0.8)',
      }}>
      <div className="text-4xl leading-none" style={{ filter: badge.earned ? 'none' : 'grayscale(1)' }}>
        {badge.icon}
      </div>
      <div>
        <p className="text-xs font-black" style={{ color: badge.earned ? badge.color : theme.textMuted }}>
          {badge.name}
        </p>
        <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5"
          style={{ color: rc.color, opacity: badge.earned ? 1 : 0.6 }}>
          {badge.rarity}
        </p>
      </div>
      <p className="text-[10px] leading-tight" style={{ color: theme.textMuted }}>{badge.desc}</p>
      {badge.earned ? (
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
          style={{ background: `${badge.color}25`, color: badge.color }}>+{badge.xp} XP</span>
      ) : (
        <span className="text-[10px] font-semibold" style={{ color: theme.textMuted }}>
          🔒 {badge.xp} XP on unlock
        </span>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AchievementsClient({ stats, streak, totalXP, levelData, challenges }: Props) {
  const { theme, accentColor } = useTheme();
  const [tab, setTab] = useState<'badges'|'challenges'|'stats'>('badges');
  const badges  = buildBadges(stats, streak.current);
  const earned  = badges.filter(b => b.earned);
  const locked  = badges.filter(b => !b.earned);

  const card: React.CSSProperties = {
    background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 20,
  };

  return (
    <div className="space-y-5 pt-2">

      <div>
        <h1 className="text-2xl font-black" style={{ color: theme.textPrimary }}>Achievements 🏆</h1>
        <p className="text-sm mt-0.5" style={{ color: theme.textMuted }}>
          Level {levelData.level} · <AnimCount to={totalXP} /> XP · {earned.length}/{badges.length} badges
        </p>
      </div>

      {/* ── Level card ─── */}
      <div className="rounded-3xl p-5 relative overflow-hidden"
        style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}40` }}>
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle,white 1px,transparent 1px)', backgroundSize:'18px 18px' }} />

        <div className="relative flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>
              Current Level
            </p>
            <p className="text-5xl font-black leading-none mt-1" style={{ color: accentColor }}>
              <AnimCount to={levelData.level} />
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>Total XP</p>
            <p className="text-3xl font-black" style={{ color: theme.textPrimary }}>
              <AnimCount to={totalXP} />
            </p>
          </div>
        </div>

        <div className="relative space-y-2">
          <div className="flex justify-between text-xs">
            <span style={{ color: theme.textMuted }}>Level {levelData.level}</span>
            <span className="font-bold" style={{ color: accentColor }}>
              {levelData.currentXP}/{levelData.neededXP} XP → Level {levelData.level + 1}
            </span>
          </div>
          <XPBar pct={levelData.pct} color={accentColor} />
          <p className="text-[10px] text-right" style={{ color: theme.textMuted }}>
            {levelData.neededXP - levelData.currentXP} XP to next level
          </p>
        </div>
      </div>

      {/* ── Streak ─── */}
      <div style={card} className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>
              Attendance Streak
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-4xl font-black" style={{ color: streak.isActive ? '#F97316' : theme.textMuted }}>
                <AnimCount to={streak.current} />
              </p>
              <p className="text-sm font-bold" style={{ color: theme.textMuted }}>sessions</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>Best Ever</p>
            <p className="text-2xl font-black mt-1" style={{ color: theme.textPrimary }}>{streak.longest}</p>
          </div>
        </div>

        <StreakDots weekDots={streak.weekDots} accentColor={accentColor} />

        <div className="mt-4 pt-4 flex items-center justify-between"
          style={{ borderTop: `1px solid ${theme.cardBorder}` }}>
          <p className="text-xs" style={{ color: theme.textMuted }}>
            {streak.isActive && streak.current > 0
              ? `🔥 Active — keep it going!`
              : streak.current === 0
              ? '📅 Start your streak at the next session'
              : '💤 Streak paused — come back!'}
          </p>
          {streak.current >= 3 && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(249,115,22,0.15)', color: '#F97316' }}>
              🔥 On streak!
            </span>
          )}
        </div>
      </div>

      {/* ── Tab nav ─── */}
      <div className="flex gap-1 p-1 rounded-2xl" style={card}>
        {([['badges','🏅 Badges'],['challenges','🎯 Challenges'],['stats','📊 Stats']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all"
            style={{
              background: tab===key ? accentColor : 'transparent',
              color:      tab===key ? 'white'     : theme.textMuted,
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── BADGES tab ─── */}
      {tab === 'badges' && (
        <div className="space-y-5">
          {/* Rarity legend */}
          <div className="grid grid-cols-4 gap-2">
            {(['Common','Rare','Epic','Legendary'] as const).map(r => {
              const rc  = RARITY[r];
              const cnt = earned.filter(b => b.rarity === r).length;
              const tot = badges.filter(b => b.rarity === r).length;
              return (
                <div key={r} className="rounded-xl p-2.5 text-center"
                  style={{ background: rc.bg, border: `1px solid ${rc.color}25` }}>
                  <p className="text-base font-black" style={{ color: rc.color }}>{cnt}<span style={{ color: theme.textMuted }}>/{tot}</span></p>
                  <p className="text-[9px] font-bold uppercase tracking-wide mt-0.5" style={{ color: rc.color }}>{r}</p>
                </div>
              );
            })}
          </div>

          {earned.length > 0 && (
            <>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>
                ✅ Earned ({earned.length})
              </p>
              <div className="grid grid-cols-2 gap-3">
                {earned.map(b => <BadgeCard key={b.id} badge={b} />)}
              </div>
            </>
          )}

          {locked.length > 0 && (
            <>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>
                🔒 Locked — Keep Going ({locked.length})
              </p>
              <div className="grid grid-cols-2 gap-3">
                {locked.map(b => <BadgeCard key={b.id} badge={b} />)}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── CHALLENGES tab ─── */}
      {tab === 'challenges' && (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: theme.textMuted }}>
            Complete challenges to earn bonus XP. Progress updates automatically.
          </p>
          {challenges.map(ch => <ChallengeCard key={ch.id} ch={ch} />)}
        </div>
      )}

      {/* ── STATS tab ─── */}
      {tab === 'stats' && (
        <div className="space-y-3">
          {[
            { label: 'Sessions Attended',  value: stats.presStreak,    icon: '📅', color: '#60A5FA' },
            { label: 'Assessments Taken',  value: stats.totalAss,      icon: '📝', color: '#A78BFA' },
            { label: 'Projects Completed', value: stats.doneProj,      icon: '🚀', color: '#F97316' },
            { label: 'Distinctions',        value: stats.distinctions, icon: '⭐', color: '#FCD34D' },
            { label: 'Mentorship Sessions',value: stats.mentorship,    icon: '💬', color: '#8B5CF6' },
            { label: 'Longest Streak',      value: streak.longest,     icon: '🔥', color: '#F97316' },
            { label: 'Current Streak',      value: streak.current,     icon: '⚡', color: '#F97316' },
            { label: 'Badges Earned',       value: earned.length,      icon: '🏅', color: accentColor },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3.5 rounded-2xl"
              style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{icon}</span>
                <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{label}</p>
              </div>
              <p className="text-2xl font-black tabular-nums" style={{ color }}>
                <AnimCount to={value} />
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
