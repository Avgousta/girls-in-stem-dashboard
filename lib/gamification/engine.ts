// ═══════════════════════════════════════════════════════════════════════════════
// Girls in STEM — Gamification Engine (pure functions, no side effects)
// Runs server-side; outputs are passed to client as props.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── XP SYSTEM ───────────────────────────────────────────────────────────────
// Non-linear XP curve: more XP per level as you progress

export const XP_REWARDS = {
  SESSION_PRESENT:     15,   // attended a session
  SESSION_LATE:         5,   // showed up even if late
  ASSESSMENT_BASE:     10,   // just taking a test
  ASSESSMENT_PASS:     15,   // 50%+
  ASSESSMENT_MERIT:    25,   // 70%+
  ASSESSMENT_DISTINCTION: 50, // 80%+
  PROJECT_SUBMITTED:   30,   // submitted for review
  PROJECT_COMPLETED:   75,   // marked/completed
  STREAK_3:            25,   // 3-session streak bonus
  STREAK_5:            50,   // 5-session streak
  STREAK_10:          100,   // 10-session streak
  MENTORSHIP:          20,   // had a mentorship session
  PROFILE_COMPLETE:    30,   // filled in bio + aspiration
  FIRST_BADGE:         20,   // earned any badge
} as const;

export function xpForLevel(level: number): number {
  // Quadratic curve: level 1→2 = 100xp, level 5→6 = 500xp, level 10→11 = 1000xp
  return level * 100;
}

export function levelFromTotalXP(totalXP: number): {
  level: number; currentXP: number; neededXP: number; pct: number;
} {
  let level = 1;
  let remaining = totalXP;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  const needed = xpForLevel(level);
  return {
    level,
    currentXP: remaining,
    neededXP:  needed,
    pct:       Math.round((remaining / needed) * 100),
  };
}

export function calcTotalXP(
  attendance: Array<{ status: string }>,
  assessments: Array<{ percentage: string | number | null; grade_band?: string | null }>,
  projects: Array<{ stage?: string | null; completion_status?: string | null }>,
  mentorship: number,
  hasCompleteProfile: boolean,
  sessionStreak: number,
): number {
  let xp = 0;

  // Attendance XP
  attendance.forEach(a => {
    if (a.status === 'present') xp += XP_REWARDS.SESSION_PRESENT;
    if (a.status === 'late')    xp += XP_REWARDS.SESSION_LATE;
  });

  // Streak bonuses (applied once, not per streak break)
  if (sessionStreak >= 10) xp += XP_REWARDS.STREAK_10;
  else if (sessionStreak >= 5) xp += XP_REWARDS.STREAK_5;
  else if (sessionStreak >= 3) xp += XP_REWARDS.STREAK_3;

  // Assessment XP
  assessments.forEach(a => {
    const pct = Number(a.percentage || 0);
    xp += XP_REWARDS.ASSESSMENT_BASE;
    if (pct >= 80) xp += XP_REWARDS.ASSESSMENT_DISTINCTION;
    else if (pct >= 70) xp += XP_REWARDS.ASSESSMENT_MERIT;
    else if (pct >= 50) xp += XP_REWARDS.ASSESSMENT_PASS;
  });

  // Project XP
  projects.forEach(p => {
    const stage = p.stage || p.completion_status || '';
    if (['marked','completed'].includes(stage)) xp += XP_REWARDS.PROJECT_COMPLETED;
    else if (stage === 'submitted') xp += XP_REWARDS.PROJECT_SUBMITTED;
  });

  // Mentorship
  xp += mentorship * XP_REWARDS.MENTORSHIP;

  // Profile bonus
  if (hasCompleteProfile) xp += XP_REWARDS.PROFILE_COMPLETE;

  return xp;
}

// ─── STREAK ENGINE ────────────────────────────────────────────────────────────
export interface StreakData {
  current:    number;   // consecutive sessions attended
  longest:    number;   // all-time best streak
  lastSession:string | null;  // ISO date of most recent session
  isActive:   boolean;  // streak is live (last session ≤ 7 days ago)
  weekDots:   Array<{ date: string; present: boolean; hasSessions: boolean }>;
}

export function calcStreak(
  attendance: Array<{ status: string; session_date: string }>,
): StreakData {
  if (!attendance.length) {
    return { current: 0, longest: 0, lastSession: null, isActive: false, weekDots: [] };
  }

  // Sort ascending
  const sorted = [...attendance].sort((a, b) => a.session_date.localeCompare(b.session_date));

  // Group by date — a date is "present" if any session that day was present
  const byDate: Record<string, boolean> = {};
  sorted.forEach(a => {
    if (!byDate[a.session_date]) byDate[a.session_date] = false;
    if (a.status === 'present') byDate[a.session_date] = true;
  });

  const dates = Object.keys(byDate).sort();

  // Walk backwards to calculate current streak
  let current = 0;
  let longest = 0;
  let run     = 0;
  let prevDate: Date | null = null;

  for (let i = dates.length - 1; i >= 0; i--) {
    const d    = new Date(dates[i]);
    const pres = byDate[dates[i]];
    if (!pres) { if (i === dates.length - 1) break; continue; }

    if (prevDate === null) {
      run = 1;
    } else {
      const dayDiff = Math.round((prevDate.getTime() - d.getTime()) / 86400000);
      if (dayDiff <= 7) { run++; } // within a week = part of streak
      else break;
    }
    prevDate = d;
    if (i === dates.length - 1 || current === 0) current = run;
  }

  // Longest streak (forward pass)
  let tempRun = 0;
  let tempPrev: Date | null = null;
  for (const date of dates) {
    const d    = new Date(date);
    const pres = byDate[date];
    if (!pres) { tempRun = 0; tempPrev = null; continue; }
    if (tempPrev === null) tempRun = 1;
    else {
      const diff = Math.round((d.getTime() - tempPrev.getTime()) / 86400000);
      if (diff <= 7) tempRun++;
      else tempRun = 1;
    }
    tempPrev = d;
    longest  = Math.max(longest, tempRun);
  }

  // Last 7 calendar days
  const today = new Date();
  const weekDots = Array.from({ length: 7 }, (_, i) => {
    const d   = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const key = d.toISOString().slice(0,10);
    return {
      date:        d.toLocaleDateString('en-ZA',{weekday:'short'}),
      present:     byDate[key] === true,
      hasSessions: key in byDate,
    };
  });

  const lastSession = dates[dates.length - 1] || null;
  const daysSinceLast = lastSession
    ? Math.round((today.getTime() - new Date(lastSession).getTime()) / 86400000)
    : 999;

  return { current, longest, lastSession, isActive: daysSinceLast <= 7, weekDots };
}

// ─── CHALLENGES ───────────────────────────────────────────────────────────────
export interface Challenge {
  id:       string;
  icon:     string;
  title:    string;
  desc:     string;
  progress: number;   // 0–100
  current:  number;
  target:   number;
  unit:     string;
  xpReward: number;
  done:     boolean;
  color:    string;
}

export function buildChallenges(
  attendance: Array<{ status: string }>,
  assessments: Array<{ percentage: string | number | null; grade_band?: string | null }>,
  projects: Array<{ stage?: string | null; completion_status?: string | null }>,
  streak: number,
): Challenge[] {
  const present   = attendance.filter(a => a.status === 'present').length;
  const doneProj  = projects.filter(p => ['marked','completed'].includes(p.stage||p.completion_status||'')).length;
  const avgScore  = assessments.length
    ? Math.round(assessments.reduce((s, a) => s + Number(a.percentage || 0), 0) / assessments.length) : 0;
  const highScores= assessments.filter(a => Number(a.percentage||0) >= 80).length;

  const ch: Challenge[] = [
    {
      id: 'att_10', icon: '📅', title: 'Show Up 10 Times', unit: 'sessions',
      desc: 'Attend 10 sessions to build the habit',
      current: Math.min(present, 10), target: 10, xpReward: 75, color: '#2DD4A0',
      done: present >= 10, progress: Math.min(Math.round(present/10*100), 100),
    },
    {
      id: 'score_70', icon: '🎯', title: 'Score 70% Average', unit: '%',
      desc: 'Maintain a 70%+ class average',
      current: avgScore, target: 70, xpReward: 100, color: '#60A5FA',
      done: avgScore >= 70, progress: Math.min(Math.round(avgScore/70*100), 100),
    },
    {
      id: 'streak_5', icon: '🔥', title: '5-Session Streak', unit: 'sessions',
      desc: 'Attend 5 consecutive sessions',
      current: Math.min(streak, 5), target: 5, xpReward: 50, color: '#F97316',
      done: streak >= 5, progress: Math.min(Math.round(streak/5*100), 100),
    },
    {
      id: 'project_1', icon: '🚀', title: 'Launch a Project', unit: 'projects',
      desc: 'Complete and submit your first project',
      current: Math.min(doneProj, 1), target: 1, xpReward: 80, color: '#A78BFA',
      done: doneProj >= 1, progress: doneProj >= 1 ? 100 : 0,
    },
    {
      id: 'distinction_3', icon: '⭐', title: '3 Top Results', unit: 'distinctions',
      desc: 'Score 80%+ on three assessments',
      current: Math.min(highScores, 3), target: 3, xpReward: 150, color: '#FCD34D',
      done: highScores >= 3, progress: Math.min(Math.round(highScores/3*100), 100),
    },
    {
      id: 'att_20', icon: '🏅', title: 'Dedicated Learner', unit: 'sessions',
      desc: 'Attend 20 sessions total',
      current: Math.min(present, 20), target: 20, xpReward: 200, color: '#2DD4A0',
      done: present >= 20, progress: Math.min(Math.round(present/20*100), 100),
    },
  ];

  // Sort: in-progress first, then not-started, then done
  return ch.sort((a, b) => {
    if (a.done && !b.done) return 1;
    if (!a.done && b.done) return -1;
    if (a.progress > 0 && b.progress === 0) return -1;
    if (a.progress === 0 && b.progress > 0) return 1;
    return b.progress - a.progress;
  });
}

// ─── MILESTONE DETECTION ─────────────────────────────────────────────────────
export interface Milestone {
  id:      string;
  icon:    string;
  title:   string;
  desc:    string;
  xp:      number;
  color:   string;
}

export function detectNewMilestones(
  attendance: Array<{ status: string }>,
  assessments: Array<{ percentage: string|number }>,
  projects: Array<{ stage?: string | null; completion_status?: string | null }>,
  badges: Array<{ id: string; earned: boolean }>,
  streak: number,
): Milestone[] {
  const milestones: Milestone[] = [];
  const present   = attendance.filter(a => a.status === 'present').length;
  const avgScore  = assessments.length
    ? Math.round(assessments.reduce((s, a) => s + Number(a.percentage || 0), 0) / assessments.length) : 0;

  if (present === 1)  milestones.push({ id:'first_session',  icon:'👣', title:'First Session!',       desc:'You showed up. That\'s everything.',    xp:15,  color:'#60A5FA' });
  if (present === 5)  milestones.push({ id:'5_sessions',     icon:'🌟', title:'5 Sessions Done!',      desc:'Building momentum!',                   xp:50,  color:'#FCD34D' });
  if (present === 10) milestones.push({ id:'10_sessions',    icon:'🔥', title:'10 Sessions!',          desc:'You\'re a regular now.',               xp:100, color:'#F97316' });
  if (streak === 3)   milestones.push({ id:'streak_3',       icon:'⚡', title:'3-Session Streak!',     desc:'Consistency is your superpower.',      xp:25,  color:'#F97316' });
  if (streak === 5)   milestones.push({ id:'streak_5',       icon:'🔥', title:'5-Session Streak!',     desc:'You\'re on fire!',                     xp:50,  color:'#F97316' });
  if (avgScore >= 70) milestones.push({ id:'avg_70',         icon:'📈', title:'70%+ Average!',         desc:'Academic excellence.',                 xp:75,  color:'#2DD4A0' });
  if (avgScore >= 80) milestones.push({ id:'avg_80',         icon:'🎓', title:'80%+ Average!',         desc:'You\'re in the top tier.',             xp:150, color:'#FCD34D' });

  return milestones;
}
