import { describe, it, expect } from 'vitest';

// ── Grade band recompute (from assessments/[id] PATCH) ────────────────────────

function computeGradeBand(score: number, maxScore: number): string {
  const pct = (score / maxScore) * 100;
  return pct >= 80 ? 'Distinction' : pct >= 70 ? 'Merit' : pct >= 50 ? 'Pass' : 'Needs Support';
}

describe('computeGradeBand (assessment PATCH)', () => {
  it('80% = Distinction', () => expect(computeGradeBand(40, 50)).toBe('Distinction'));
  it('100% = Distinction', () => expect(computeGradeBand(50, 50)).toBe('Distinction'));
  it('79% = Merit', () => expect(computeGradeBand(79, 100)).toBe('Merit'));
  it('70% = Merit', () => expect(computeGradeBand(70, 100)).toBe('Merit'));
  it('69% = Pass', () => expect(computeGradeBand(69, 100)).toBe('Pass'));
  it('50% = Pass', () => expect(computeGradeBand(50, 100)).toBe('Pass'));
  it('49% = Needs Support', () => expect(computeGradeBand(49, 100)).toBe('Needs Support'));
  it('0% = Needs Support', () => expect(computeGradeBand(0, 100)).toBe('Needs Support'));
  it('works with non-100 max_score', () => expect(computeGradeBand(16, 20)).toBe('Distinction')); // 80%
});

// ── Auto-flag intervention threshold (from assessments POST) ──────────────────

function shouldAutoFlag(score: number, maxScore: number): boolean {
  return Math.round((score / maxScore) * 100) < 40;
}

function autoFlagPriority(score: number, maxScore: number): 'high' | 'medium' {
  const pct = Math.round((score / maxScore) * 100);
  return pct < 25 ? 'high' : 'medium';
}

describe('shouldAutoFlag (assessments POST)', () => {
  it('flags when score < 40%', () => expect(shouldAutoFlag(39, 100)).toBe(true));
  it('does not flag at exactly 40%', () => expect(shouldAutoFlag(40, 100)).toBe(false));
  it('does not flag above 40%', () => expect(shouldAutoFlag(80, 100)).toBe(false));
  it('flags 0%', () => expect(shouldAutoFlag(0, 100)).toBe(true));
  it('works with non-100 max_score', () => {
    expect(shouldAutoFlag(7, 50)).toBe(true);   // 14%
    expect(shouldAutoFlag(20, 50)).toBe(false);  // 40%
  });
});

describe('autoFlagPriority (assessments POST)', () => {
  it('< 25% = high priority', () => expect(autoFlagPriority(24, 100)).toBe('high'));
  it('exactly 25% = medium priority', () => expect(autoFlagPriority(25, 100)).toBe('medium'));
  it('25–39% = medium priority', () => expect(autoFlagPriority(35, 100)).toBe('medium'));
});

// ── Allowed PATCH fields filter (from assessments/[id] PATCH) ─────────────────

const ALLOWED_PATCH_FIELDS = ['score','max_score','grade_band','assessment_date','notes',
  'feedback_strengths','feedback_improvements','feedback_actions','term','weighting','skill_tags'];

function filterAllowedFields(body: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED_PATCH_FIELDS.includes(k)));
}

describe('filterAllowedFields (assessments PATCH)', () => {
  it('strips disallowed fields like learner_id', () => {
    const result = filterAllowedFields({ score: 80, learner_id: 'xxx', subject: 'Math' });
    expect(result).not.toHaveProperty('learner_id');
    expect(result).not.toHaveProperty('subject');
    expect(result).toHaveProperty('score', 80);
  });

  it('keeps all allowed fields', () => {
    const body = { score: 45, max_score: 50, notes: 'Good effort', term: 2 };
    const result = filterAllowedFields(body);
    expect(Object.keys(result)).toHaveLength(4);
  });

  it('returns empty object when no allowed fields present', () => {
    const result = filterAllowedFields({ subject: 'Math', learner_id: 'x' });
    expect(Object.keys(result)).toHaveLength(0);
  });
});

// ── Intervention resolved_at stamping (from interventions/[id] PATCH) ────────

function buildInterventionUpdate(data: { status?: string; action_taken?: string }): Record<string, unknown> {
  const updates: Record<string, unknown> = { ...data };
  if (data.status === 'resolved') {
    updates.resolved_at = new Date().toISOString();
  }
  return updates;
}

describe('buildInterventionUpdate', () => {
  it('stamps resolved_at when status = "resolved"', () => {
    const result = buildInterventionUpdate({ status: 'resolved' });
    expect(result).toHaveProperty('resolved_at');
    expect(typeof result.resolved_at).toBe('string');
  });

  it('does not add resolved_at for other statuses', () => {
    expect(buildInterventionUpdate({ status: 'open' })).not.toHaveProperty('resolved_at');
    expect(buildInterventionUpdate({ status: 'in_progress' })).not.toHaveProperty('resolved_at');
  });

  it('does not add resolved_at when no status provided', () => {
    expect(buildInterventionUpdate({ action_taken: 'Called parent' })).not.toHaveProperty('resolved_at');
  });
});
