export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { ok, err } from '@/app/api/helpers';
import {
  leadSchema, deriveCategory, pillarsFor, suggestPriority,
  interestLabel, nextStepLabel, CONTEXT_QUESTIONS, LEAD_SOURCE,
} from '@/lib/connect';
import { emailNewConferenceLead, emailConferenceLeadAcknowledgement } from '@/lib/email';

// Public endpoint — the conference QR form posts here without signing in.
// Inserts with the service role; the lead register itself is admin-only (RLS).
export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return err('Invalid request'); }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message, 422);
  const v = parsed.data;

  // Honeypot filled → pretend success so bots learn nothing
  if (v.website) return ok({ received: true });

  const category = deriveCategory(v.interests);
  const priority = suggestPriority(v.next_step);
  const supabase = createAdminClient();

  const { error } = await supabase.from('conference_leads').insert({
    full_name:        v.full_name,
    email:            v.email,
    organisation:     v.organisation || null,
    job_title:        v.job_title || null,
    country:          v.country,
    interests:        v.interests,
    context_answer:   v.context_answer || null,
    message:          v.message || null,
    next_step:        v.next_step,
    marketing_opt_in: v.marketing_opt_in,
    source:           LEAD_SOURCE,
    lead_category:    category,
    priority,
  });

  if (error) {
    console.error('[connect] lead insert failed:', error.message);
    return err('We could not save your details just now. Please try again.', 500);
  }

  // Notifications must never block or fail the visitor's submission
  try {
    const emailData = {
      fullName: v.full_name, email: v.email, organisation: v.organisation, jobTitle: v.job_title,
      country: v.country, interests: v.interests.map(interestLabel), category, priority,
      contextQuestion: CONTEXT_QUESTIONS[category], contextAnswer: v.context_answer,
      message: v.message, nextStep: nextStepLabel(v.next_step), marketingOptIn: v.marketing_opt_in,
    };

    const { data: admins } = await supabase
      .from('users').select('user_id, email').eq('role', 'admin').eq('is_active', true);
    const adminRows = (admins ?? []) as Array<{ user_id: string; email: string }>;

    // CONNECT_NOTIFY_EMAIL (comma-separated) is the designated inbox; admins are the fallback
    const inbox = (process.env.CONNECT_NOTIFY_EMAIL ?? '')
      .split(',').map(s => s.trim()).filter(Boolean);
    const recipients = inbox.length ? inbox : adminRows.map(a => a.email);

    await Promise.all([
      emailNewConferenceLead(recipients, emailData),
      emailConferenceLeadAcknowledgement({ ...emailData, pillars: pillarsFor(v.interests) }),
      adminRows.length
        ? supabase.from('notifications').insert(adminRows.map(a => ({
            user_id: a.user_id,
            type:    'conference_lead',
            title:   `New conference lead — ${v.full_name}`,
            body:    `${category} · ${nextStepLabel(v.next_step)}${v.organisation ? ` · ${v.organisation}` : ''}`,
          })))
        : Promise.resolve(),
    ]);
  } catch (e) {
    console.error('[connect] lead notifications failed:', e);
  }

  return ok({ received: true }, 201);
}
