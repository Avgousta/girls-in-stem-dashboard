/**
 * Email service — uses Resend when RESEND_API_KEY is set.
 * Always creates an in-app notification regardless of email status.
 * Import createNotification separately for in-app-only cases.
 */
import { Resend } from 'resend';
import { createNotification } from '@/lib/notifications';

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Girls in STEM <noreply@girlsstem.org>';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === 'placeholder') return null;
  return new Resend(key);
}

// ─── Email templates ──────────────────────────────────────────────────────────

function baseHtml(title: string, body: string) {
  return `<!DOCTYPE html><html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0C0919;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#160B2E;border-radius:16px;overflow:hidden;border:1px solid rgba(124,58,237,0.3);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#7C3AED,#6D28D9);padding:24px 32px;">
      <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.1em;color:rgba(196,181,253,0.8);text-transform:uppercase;">Melisizwe Girls in STEM</p>
      <h1 style="margin:8px 0 0;font-size:20px;font-weight:800;color:#fff;">${title}</h1>
    </div>
    <!-- Body -->
    <div style="padding:28px 32px;">
      ${body}
    </div>
    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);">
      <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.3);">
        Girls in STEM Platform · You're receiving this because you're part of the Melisizwe Programme.
      </p>
    </div>
  </div>
</body></html>`;
}

function detail(label: string, value: string) {
  return `<div style="margin-bottom:12px;">
    <p style="margin:0 0 2px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(167,139,250,0.8);">${label}</p>
    <p style="margin:0;font-size:14px;color:rgba(240,238,255,0.85);">${value}</p>
  </div>`;
}

function pill(text: string, color: string) {
  return `<span style="display:inline-block;background:${color}20;color:${color};border:1px solid ${color}50;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700;">${text}</span>`;
}

// ─── Send helpers ─────────────────────────────────────────────────────────────

interface SendResult { ok: boolean; error?: string }

async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  const resend = getResend();
  if (!resend) {
    console.info(`[email] RESEND_API_KEY not set — skipping email to ${to}: ${subject}`);
    return { ok: true }; // silent skip — in-app notification still fires
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
    return { ok: true };
  } catch (e: any) {
    console.error('[email] send failed:', e?.message);
    return { ok: false, error: e?.message };
  }
}

// ─── Intervention emails ──────────────────────────────────────────────────────

export async function emailInterventionAssigned({
  assigneeEmail, assigneeName, assigneeUserId, learnerName, school,
  priority, type, reason, interventionId,
}: {
  assigneeEmail: string; assigneeName: string; assigneeUserId: string;
  learnerName: string; school: string; priority: string; type: string;
  reason: string; interventionId: string;
}) {
  const subject = `Intervention assigned — ${learnerName} (${priority} priority)`;
  const html = baseHtml('Intervention Assigned to You', `
    <p style="color:rgba(240,238,255,0.8);font-size:14px;margin:0 0 20px;">
      A ${priority}-priority intervention has been assigned to you.
    </p>
    ${detail('Learner', learnerName)}
    ${detail('School', school)}
    ${detail('Type', type.charAt(0).toUpperCase() + type.slice(1))}
    <div style="margin-bottom:12px;">
      <p style="margin:0 0 2px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(167,139,250,0.8);">Priority</p>
      ${pill(priority.toUpperCase(), priority === 'critical' ? '#EF4444' : priority === 'high' ? '#F97316' : '#FBBF24')}
    </div>
    ${detail('Reason', reason)}
    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/interventions"
      style="display:inline-block;margin-top:20px;padding:12px 24px;background:linear-gradient(135deg,#7C3AED,#6D28D9);color:#fff;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">
      View Intervention
    </a>
  `);

  await Promise.all([
    sendEmail(assigneeEmail, subject, html),
    createNotification({
      user_id: assigneeUserId,
      type: 'intervention_assigned',
      title: `Intervention assigned — ${learnerName}`,
      body: `${priority} priority · ${type} · ${reason.slice(0, 100)}`,
    }),
  ]);
}

export async function emailInterventionEscalated({
  assigneeEmail, assigneeName, assigneeUserId, learnerName, school,
  oldPriority, newPriority, reason, escalatedBy, interventionId,
}: {
  assigneeEmail: string; assigneeName: string; assigneeUserId: string;
  learnerName: string; school: string; oldPriority: string; newPriority: string;
  reason: string; escalatedBy: string; interventionId: string;
}) {
  const subject = `⚠️ Intervention escalated — ${learnerName} is now ${newPriority.toUpperCase()} priority`;
  const html = baseHtml('Intervention Escalated', `
    <p style="color:rgba(240,238,255,0.8);font-size:14px;margin:0 0 20px;">
      An intervention assigned to you has been escalated.
    </p>
    ${detail('Learner', learnerName)}
    ${detail('School', school)}
    <div style="margin-bottom:16px;">
      <p style="margin:0 0 6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(167,139,250,0.8);">Priority Change</p>
      <p style="margin:0;">
        ${pill(oldPriority.toUpperCase(), '#94A3B8')}
        <span style="color:rgba(255,255,255,0.4);margin:0 8px;">→</span>
        ${pill(newPriority.toUpperCase(), newPriority === 'critical' ? '#EF4444' : '#F97316')}
      </p>
    </div>
    ${detail('Escalation Reason', reason)}
    ${detail('Escalated by', escalatedBy)}
    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/interventions"
      style="display:inline-block;margin-top:20px;padding:12px 24px;background:linear-gradient(135deg,#EF4444,#DC2626);color:#fff;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">
      View Now — Action Required
    </a>
  `);

  await Promise.all([
    sendEmail(assigneeEmail, subject, html),
    createNotification({
      user_id: assigneeUserId,
      type: 'intervention_escalated',
      title: `Escalated — ${learnerName} now ${newPriority.toUpperCase()}`,
      body: reason.slice(0, 120),
    }),
  ]);
}

export async function emailInterventionResolved({
  flaggedByEmail, flaggedByUserId, learnerName, resolvedBy, resolution, interventionId,
}: {
  flaggedByEmail: string; flaggedByUserId: string; learnerName: string;
  resolvedBy: string; resolution: string; interventionId: string;
}) {
  const subject = `✓ Intervention resolved — ${learnerName}`;
  const html = baseHtml('Intervention Resolved', `
    <p style="color:rgba(240,238,255,0.8);font-size:14px;margin:0 0 20px;">
      An intervention you logged for ${learnerName} has been resolved.
    </p>
    ${detail('Learner', learnerName)}
    ${detail('Resolved by', resolvedBy)}
    ${detail('Resolution', resolution)}
    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/interventions"
      style="display:inline-block;margin-top:20px;padding:12px 24px;background:linear-gradient(135deg,#059669,#047857);color:#fff;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">
      View Outcome
    </a>
  `);

  await Promise.all([
    sendEmail(flaggedByEmail, subject, html),
    createNotification({
      user_id: flaggedByUserId,
      type: 'intervention_resolved',
      title: `Resolved — ${learnerName}`,
      body: `${resolvedBy}: ${resolution.slice(0, 100)}`,
    }),
  ]);
}
