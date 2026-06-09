import { describe, it, expect } from 'vitest';
import { xpForLevel, levelFromTotalXP, calcTotalXP, calcStreak } from '../lib/gamification/engine';

describe('xpForLevel', () => {
  it('level 1 requires 100 xp', () => expect(xpForLevel(1)).toBe(100));
  it('level 5 requires 500 xp', () => expect(xpForLevel(5)).toBe(500));
  it('level 10 requires 1000 xp', () => expect(xpForLevel(10)).toBe(1000));
});

describe('levelFromTotalXP', () => {
  it('0 xp = level 1 with 0 current', () => {
    const r = levelFromTotalXP(0);
    expect(r.level).toBe(1);
    expect(r.currentXP).toBe(0);
  });

  it('100 xp = level 2', () => {
    const r = levelFromTotalXP(100);
    expect(r.level).toBe(2);
    expect(r.currentXP).toBe(0);
  });

  it('150 xp = level 2 with 50 carried', () => {
    const r = levelFromTotalXP(150);
    expect(r.level).toBe(2);
    expect(r.currentXP).toBe(50);
  });

  it('pct is between 0 and 100', () => {
    const r = levelFromTotalXP(250);
    expect(r.pct).toBeGreaterThanOrEqual(0);
    expect(r.pct).toBeLessThanOrEqual(100);
  });
});

describe('calcTotalXP', () => {
  it('returns 0 for empty inputs', () => {
    expect(calcTotalXP([], [], [], 0, false, 0)).toBe(0);
  });

  it('awards SESSION_PRESENT (15) per attended session', () => {
    const att = [{ status: 'present' }, { status: 'present' }];
    expect(calcTotalXP(att, [], [], 0, false, 0)).toBe(30);
  });

  it('awards SESSION_LATE (5) for late attendance', () => {
    const att = [{ status: 'late' }];
    expect(calcTotalXP(att, [], [], 0, false, 0)).toBe(5);
  });

  it('adds STREAK_3 bonus at streak=3', () => {
    const xpNoStreak  = calcTotalXP([], [], [], 0, false, 2);
    const xpStreak3   = calcTotalXP([], [], [], 0, false, 3);
    expect(xpStreak3 - xpNoStreak).toBe(25); // STREAK_3 = 25
  });

  it('awards distinction bonus (50) for 80%+ score', () => {
    const ass = [{ percentage: 85 }];
    const xp = calcTotalXP([], ass, [], 0, false, 0);
    // ASSESSMENT_BASE (10) + ASSESSMENT_DISTINCTION (50)
    expect(xp).toBe(60);
  });

  it('awards merit bonus (25) for 70–79%', () => {
    const ass = [{ percentage: 75 }];
    const xp = calcTotalXP([], ass, [], 0, false, 0);
    // ASSESSMENT_BASE (10) + ASSESSMENT_MERIT (25)
    expect(xp).toBe(35);
  });

  it('awards profile complete bonus', () => {
    const xpWithProfile    = calcTotalXP([], [], [], 0, true, 0);
    const xpWithoutProfile = calcTotalXP([], [], [], 0, false, 0);
    expect(xpWithProfile - xpWithoutProfile).toBe(30); // PROFILE_COMPLETE = 30
  });

  it('awards mentorship xp (20 per session)', () => {
    expect(calcTotalXP([], [], [], 3, false, 0)).toBe(60);
  });

  it('awards PROJECT_COMPLETED (75) for marked stage', () => {
    const proj = [{ stage: 'marked' }];
    expect(calcTotalXP([], [], proj, 0, false, 0)).toBe(75);
  });
});

describe('calcStreak', () => {
  it('returns zero values for empty attendance', () => {
    const s = calcStreak([]);
    expect(s.current).toBe(0);
    expect(s.longest).toBe(0);
    expect(s.isActive).toBe(false);
  });

  it('counts a single present day as streak of 1', () => {
    const today = new Date().toISOString().slice(0, 10);
    const s = calcStreak([{ status: 'present', session_date: today }]);
    expect(s.current).toBe(1);
    expect(s.isActive).toBe(true);
  });

  it('weekDots returns 7 entries when attendance exists', () => {
    const today = new Date().toISOString().slice(0, 10);
    const s = calcStreak([{ status: 'present', session_date: today }]);
    expect(s.weekDots).toHaveLength(7);
  });

  it('absent session does not start a streak', () => {
    const today = new Date().toISOString().slice(0, 10);
    const s = calcStreak([{ status: 'absent', session_date: today }]);
    expect(s.current).toBe(0);
  });
});
