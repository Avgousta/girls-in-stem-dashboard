/**
 * Conference lead capture — shared by the public /connect page, its API route
 * and the admin lead register. One QR code → one form → one lead register.
 */
import { z } from 'zod';

export const LEAD_SOURCE = 'SSOW Amsterdam 2026';

// ─── Ecosystem pillars ────────────────────────────────────────────────────────
export type Pillar = 'MCX' | 'Academy' | 'NPO';
export type LeadCategory = Pillar | 'Multiple';

export const INTERESTS = [
  { id: 'bpo_cx',            label: 'BPO / customer experience',              pillar: 'MCX' },
  { id: 'digital_ai',        label: 'Digital adoption & AI-enabled support',  pillar: 'MCX' },
  { id: 'skills_workforce',  label: 'Skills / workforce development',         pillar: 'Academy' },
  { id: 'npo_sponsorship',   label: 'NPO sponsorship / social impact',        pillar: 'NPO' },
  { id: 'mentorship',        label: 'Mentorship / volunteering',              pillar: 'NPO' },
  { id: 'strategic',         label: 'Strategic / delivery partnerships',      pillar: null },
] as const satisfies ReadonlyArray<{ id: string; label: string; pillar: Pillar | null }>;

export type InterestId = (typeof INTERESTS)[number]['id'];
export const INTEREST_IDS = INTERESTS.map(i => i.id) as [InterestId, ...InterestId[]];

/** Interest each engagement card preselects in the shared form. */
export const PILLAR_DEFAULT_INTEREST: Record<Pillar, InterestId> = {
  MCX:     'bpo_cx',
  Academy: 'skills_workforce',
  NPO:     'npo_sponsorship',
};

export const CONTEXT_QUESTIONS: Record<LeadCategory, string> = {
  MCX:      'What process or business challenge would you like to explore?',
  Academy:  'What skills or talent development opportunity interests you?',
  NPO:      'How would you like to support our programmes?',
  Multiple: 'In a sentence, what would you most like to explore with us?',
};

export const NEXT_STEPS = [
  { id: 'meeting',     label: 'Schedule a meeting' },
  { id: 'information', label: 'Send information' },
  { id: 'pilot',       label: 'Discuss a pilot / project' },
  { id: 'partnership', label: 'Explore a partnership' },
  { id: 'keep_in_touch', label: 'Keep in touch' },
] as const;

export type NextStepId = (typeof NEXT_STEPS)[number]['id'];
export const NEXT_STEP_IDS = NEXT_STEPS.map(s => s.id) as [NextStepId, ...NextStepId[]];

export const LEAD_PRIORITIES = ['High', 'Medium', 'Low'] as const;
export const LEAD_STATUSES   = ['New', 'Contacted', 'Meeting booked', 'Proposal sent', 'Won', 'Closed'] as const;

// ─── Derived fields ───────────────────────────────────────────────────────────

/** Pillars touched by a set of interests. "Strategic" spans the whole ecosystem. */
export function pillarsFor(interests: readonly string[]): Pillar[] {
  const set = new Set<Pillar>();
  for (const id of interests) {
    const pillar = INTERESTS.find(i => i.id === id)?.pillar;
    if (pillar) set.add(pillar);
  }
  return (['MCX', 'Academy', 'NPO'] as const).filter(p => set.has(p));
}

export function deriveCategory(interests: readonly string[]): LeadCategory {
  const pillars = pillarsFor(interests);
  return pillars.length === 1 ? pillars[0] : 'Multiple';
}

/** Organisation is required whenever the visitor is enquiring as a business. */
export function needsOrganisation(interests: readonly string[]): boolean {
  return interests.some(id => id === 'bpo_cx' || id === 'digital_ai' || id === 'strategic');
}

/** Starting priority from the requested next step — staff can override it. */
export function suggestPriority(nextStep: NextStepId): (typeof LEAD_PRIORITIES)[number] {
  if (nextStep === 'meeting' || nextStep === 'pilot') return 'High';
  if (nextStep === 'partnership' || nextStep === 'information') return 'Medium';
  return 'Low';
}

export function interestLabel(id: string): string {
  return INTERESTS.find(i => i.id === id)?.label ?? id;
}

export function nextStepLabel(id: string): string {
  return NEXT_STEPS.find(s => s.id === id)?.label ?? id;
}

// ─── Validation ───────────────────────────────────────────────────────────────

const trimmed = (max: number) => z.string().trim().max(max);

export const leadSchema = z.object({
  full_name:        trimmed(120).min(2, 'Please enter your full name'),
  email:            z.string().trim().toLowerCase().email('Please enter a valid work email').max(200),
  country:          trimmed(80).min(2, 'Please enter your country'),
  organisation:     trimmed(160).optional().default(''),
  job_title:        trimmed(120).optional().default(''),
  interests:        z.array(z.enum(INTEREST_IDS)).min(1, 'Choose at least one way to engage').max(INTERESTS.length),
  context_answer:   trimmed(1000).optional().default(''),
  message:          trimmed(2000).optional().default(''),
  next_step:        z.enum(NEXT_STEP_IDS, { message: 'Choose what you would like us to do next' }),
  marketing_opt_in: z.boolean().optional().default(false),
  privacy_ack:      z.literal(true, { message: 'Please confirm you have read the privacy notice' }),
  // Honeypot — real visitors never see or fill this field; the API fakes success if it is set
  website:          z.string().max(500).optional().default(''),
}).superRefine((v, ctx) => {
  if (needsOrganisation(v.interests) && v.organisation.length < 2) {
    ctx.addIssue({ code: 'custom', path: ['organisation'], message: 'Organisation is required for business enquiries' });
  }
});

export type LeadInput = z.infer<typeof leadSchema>;

export const leadUpdateSchema = z.object({
  lead_category:    z.enum(['MCX', 'Academy', 'NPO', 'Multiple']).optional(),
  priority:         z.enum(LEAD_PRIORITIES).optional(),
  owner:            trimmed(120).nullable().optional(),
  follow_up_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status:           z.enum(LEAD_STATUSES).optional(),
  internal_notes:   trimmed(4000).nullable().optional(),
});

// ─── CSV export ───────────────────────────────────────────────────────────────

export interface LeadRow {
  lead_id: string;
  created_at: string;
  full_name: string;
  email: string;
  organisation: string | null;
  job_title: string | null;
  country: string;
  interests: string[];
  context_answer: string | null;
  message: string | null;
  next_step: string;
  marketing_opt_in: boolean;
  source: string;
  lead_category: string;
  priority: string;
  owner: string | null;
  follow_up_date: string | null;
  status: string;
  internal_notes: string | null;
}

const CSV_COLUMNS: Array<[string, (r: LeadRow) => string]> = [
  ['Submitted (UTC)',  r => r.created_at],
  ['Full name',        r => r.full_name],
  ['Work email',       r => r.email],
  ['Organisation',     r => r.organisation ?? ''],
  ['Job title',        r => r.job_title ?? ''],
  ['Country',          r => r.country],
  ['Interests',        r => r.interests.map(interestLabel).join('; ')],
  ['Opportunity notes', r => r.context_answer ?? ''],
  ['Message',          r => r.message ?? ''],
  ['Requested next step', r => nextStepLabel(r.next_step)],
  ['Marketing opt-in', r => (r.marketing_opt_in ? 'Yes' : 'No')],
  ['Source',           r => r.source],
  ['Lead category',    r => r.lead_category],
  ['Priority',         r => r.priority],
  ['Owner',            r => r.owner ?? ''],
  ['Follow-up date',   r => r.follow_up_date ?? ''],
  ['Status',           r => r.status],
  ['Meeting / proposal notes', r => r.internal_notes ?? ''],
];

function csvCell(value: string): string {
  // Neutralise spreadsheet formula injection, then quote
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function leadsToCsv(rows: LeadRow[]): string {
  const header = CSV_COLUMNS.map(([h]) => csvCell(h)).join(',');
  const body   = rows.map(r => CSV_COLUMNS.map(([, get]) => csvCell(get(r))).join(','));
  // BOM so Excel opens UTF-8 names correctly
  return '﻿' + [header, ...body].join('\r\n');
}
