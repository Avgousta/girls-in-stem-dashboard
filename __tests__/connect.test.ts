import { describe, it, expect } from 'vitest';
import {
  leadSchema, deriveCategory, pillarsFor, needsOrganisation, suggestPriority, leadsToCsv, type LeadRow,
} from '@/lib/connect';

const valid = {
  full_name: 'Anna de Vries', email: 'Anna@Example.com', country: 'Netherlands',
  organisation: 'Acme BV', interests: ['bpo_cx'], next_step: 'meeting', privacy_ack: true,
};

describe('conference lead categorisation', () => {
  it('maps a single pillar to its category', () => {
    expect(deriveCategory(['bpo_cx', 'digital_ai'])).toBe('MCX');
    expect(deriveCategory(['skills_workforce'])).toBe('Academy');
    expect(deriveCategory(['npo_sponsorship', 'mentorship'])).toBe('NPO');
  });

  it('marks mixed pillars and strategic-only enquiries as Multiple', () => {
    expect(deriveCategory(['bpo_cx', 'mentorship'])).toBe('Multiple');
    expect(deriveCategory(['strategic'])).toBe('Multiple');
    expect(pillarsFor(['strategic', 'skills_workforce'])).toEqual(['Academy']);
  });

  it('requires organisation only for business enquiries', () => {
    expect(needsOrganisation(['bpo_cx'])).toBe(true);
    expect(needsOrganisation(['strategic'])).toBe(true);
    expect(needsOrganisation(['mentorship'])).toBe(false);
  });

  it('suggests priority from the requested next step', () => {
    expect(suggestPriority('meeting')).toBe('High');
    expect(suggestPriority('information')).toBe('Medium');
    expect(suggestPriority('keep_in_touch')).toBe('Low');
  });
});

describe('leadSchema', () => {
  it('accepts a complete submission and normalises email', () => {
    const r = leadSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe('anna@example.com');
      expect(r.data.marketing_opt_in).toBe(false);
    }
  });

  it('rejects a business enquiry without organisation', () => {
    const r = leadSchema.safeParse({ ...valid, organisation: '' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(['organisation']);
  });

  it('allows an NPO enquiry without organisation', () => {
    expect(leadSchema.safeParse({ ...valid, organisation: '', interests: ['mentorship'] }).success).toBe(true);
  });

  it('requires interests, next step and privacy acknowledgement', () => {
    expect(leadSchema.safeParse({ ...valid, interests: [] }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, next_step: '' }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, privacy_ack: false }).success).toBe(false);
  });

  it('rejects unknown interests', () => {
    expect(leadSchema.safeParse({ ...valid, interests: ['crypto'] }).success).toBe(false);
  });
});

describe('leadsToCsv', () => {
  const row: LeadRow = {
    lead_id: '1', created_at: '2026-10-20T09:00:00Z', full_name: 'Jo "JJ" Smith', email: 'jo@x.com',
    organisation: '=HYPERLINK("evil")', job_title: null, country: 'UK', interests: ['bpo_cx', 'mentorship'],
    context_answer: null, message: null, next_step: 'pilot', marketing_opt_in: false,
    source: 'SSOW Amsterdam 2026', lead_category: 'Multiple', priority: 'High', owner: null,
    follow_up_date: null, status: 'New', internal_notes: null,
  };

  it('escapes quotes, neutralises formulas and uses readable labels', () => {
    const csv = leadsToCsv([row]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"Jo ""JJ"" Smith"');
    expect(csv).toContain(`"'=HYPERLINK(""evil"")"`);
    expect(csv).toContain('"BPO / customer experience; Mentorship / volunteering"');
    expect(csv).toContain('"Discuss a pilot / project"');
  });
});
