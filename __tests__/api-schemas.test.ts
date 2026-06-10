import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ── Schemas mirrored from route files (kept in sync manually) ─────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const assessmentCreateSchema = z.object({
  learner_id:      z.string().uuid(),
  program_id:      z.string().uuid(),
  subject:         z.string().min(1),
  score:           z.number().min(0),
  max_score:       z.number().min(1).default(100),
  assessment_date: z.string().regex(DATE_RE),
  captured_by:     z.string().uuid().optional(),
  assessment_type: z.enum(['quiz','test','project','practical','assignment','oral','other']).default('test'),
  difficulty:      z.enum(['easy','medium','hard','advanced']).default('medium'),
  skill_tags:      z.array(z.string()).optional(),
  notes:           z.string().optional(),
  term:            z.number().int().min(1).max(4).optional(),
  weighting:       z.number().min(0.1).max(10).default(1.0),
  grade_band:      z.string().optional(),
});

const interventionCreateSchema = z.object({
  learner_id:        z.string().uuid(),
  flagged_by:        z.string().uuid(),
  intervention_type: z.enum(['academic','attendance','behavioural','personal','technical','other']).default('academic'),
  priority:          z.enum(['low','medium','high','critical']).default('medium'),
  reason:            z.string().min(5),
  action_plan:       z.string().optional(),
  assigned_to:       z.string().uuid().optional(),
  follow_up_date:    z.string().regex(DATE_RE).optional(),
  due_date:          z.string().regex(DATE_RE).optional(),
  status:            z.enum(['open','in_progress','resolved']).default('open'),
});

const interventionUpdateSchema = z.object({
  action_taken:   z.string().optional(),
  follow_up_date: z.string().optional(),
  status:         z.enum(['open', 'in_progress', 'resolved']).optional(),
  assigned_to:    z.string().uuid().optional(),
  priority:       z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

// ── Assessment schema ─────────────────────────────────────────────────────────

const UUID1 = '12345678-1234-4234-8234-123456789abc';
const UUID2 = 'abcdef12-abcd-4bcd-8bcd-abcdef123456';

const VALID_ASSESSMENT = {
  learner_id:      UUID1,
  program_id:      UUID2,
  subject:         'Mathematics',
  score:           42,
  max_score:       50,
  assessment_date: '2026-06-01',
};

describe('assessmentCreateSchema', () => {
  it('accepts a valid payload', () => {
    expect(assessmentCreateSchema.safeParse(VALID_ASSESSMENT).success).toBe(true);
  });

  it('rejects invalid learner_id (not UUID)', () => {
    const result = assessmentCreateSchema.safeParse({ ...VALID_ASSESSMENT, learner_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects empty subject', () => {
    const result = assessmentCreateSchema.safeParse({ ...VALID_ASSESSMENT, subject: '' });
    expect(result.success).toBe(false);
  });

  it('rejects negative score', () => {
    const result = assessmentCreateSchema.safeParse({ ...VALID_ASSESSMENT, score: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects max_score of 0', () => {
    const result = assessmentCreateSchema.safeParse({ ...VALID_ASSESSMENT, max_score: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = assessmentCreateSchema.safeParse({ ...VALID_ASSESSMENT, assessment_date: '01/06/2026' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid assessment_type', () => {
    const result = assessmentCreateSchema.safeParse({ ...VALID_ASSESSMENT, assessment_type: 'exam' });
    expect(result.success).toBe(false);
  });

  it('rejects difficulty "standard" (not in enum)', () => {
    const result = assessmentCreateSchema.safeParse({ ...VALID_ASSESSMENT, difficulty: 'standard' });
    expect(result.success).toBe(false);
  });

  it('rejects term out of range (5)', () => {
    const result = assessmentCreateSchema.safeParse({ ...VALID_ASSESSMENT, term: 5 });
    expect(result.success).toBe(false);
  });

  it('rejects term = 0', () => {
    const result = assessmentCreateSchema.safeParse({ ...VALID_ASSESSMENT, term: 0 });
    expect(result.success).toBe(false);
  });

  it('accepts all valid assessment_type values', () => {
    const types = ['quiz','test','project','practical','assignment','oral','other'] as const;
    for (const t of types) {
      expect(assessmentCreateSchema.safeParse({ ...VALID_ASSESSMENT, assessment_type: t }).success).toBe(true);
    }
  });

  it('defaults assessment_type to "test"', () => {
    const result = assessmentCreateSchema.safeParse(VALID_ASSESSMENT);
    expect(result.success && result.data.assessment_type).toBe('test');
  });
});

// ── Intervention create schema ─────────────────────────────────────────────────

const VALID_INTERVENTION = {
  learner_id: UUID1,
  flagged_by: UUID2,
  reason:     'Attendance below 70% for three consecutive weeks',
};

describe('interventionCreateSchema', () => {
  it('accepts a valid payload', () => {
    expect(interventionCreateSchema.safeParse(VALID_INTERVENTION).success).toBe(true);
  });

  it('rejects reason shorter than 5 chars', () => {
    const result = interventionCreateSchema.safeParse({ ...VALID_INTERVENTION, reason: 'Bad' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid priority', () => {
    const result = interventionCreateSchema.safeParse({ ...VALID_INTERVENTION, priority: 'urgent' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid intervention_type', () => {
    const result = interventionCreateSchema.safeParse({ ...VALID_INTERVENTION, intervention_type: 'financial' });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID assigned_to', () => {
    const result = interventionCreateSchema.safeParse({ ...VALID_INTERVENTION, assigned_to: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects malformed follow_up_date', () => {
    const result = interventionCreateSchema.safeParse({ ...VALID_INTERVENTION, follow_up_date: '2026/06/01' });
    expect(result.success).toBe(false);
  });

  it('defaults priority to "medium"', () => {
    const result = interventionCreateSchema.safeParse(VALID_INTERVENTION);
    expect(result.success && result.data.priority).toBe('medium');
  });

  it('defaults status to "open"', () => {
    const result = interventionCreateSchema.safeParse(VALID_INTERVENTION);
    expect(result.success && result.data.status).toBe('open');
  });
});

// ── Intervention update schema ─────────────────────────────────────────────────

describe('interventionUpdateSchema', () => {
  it('accepts empty object (all optional)', () => {
    expect(interventionUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('accepts status "resolved"', () => {
    expect(interventionUpdateSchema.safeParse({ status: 'resolved' }).success).toBe(true);
  });

  it('rejects invalid status', () => {
    expect(interventionUpdateSchema.safeParse({ status: 'closed' }).success).toBe(false);
  });

  it('rejects non-UUID assigned_to', () => {
    expect(interventionUpdateSchema.safeParse({ assigned_to: 'bad' }).success).toBe(false);
  });
});
