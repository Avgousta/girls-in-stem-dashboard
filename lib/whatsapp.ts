/**
 * WhatsApp service — uses Twilio's WhatsApp Business API.
 * Gracefully no-ops when TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are not set.
 *
 * All public functions accept a nullable `to` — they resolve silently when
 * the number is absent or the learner has not opted in.
 *
 * Phone numbers must be E.164 format: +27821234567
 * The 'whatsapp:' prefix is added internally by this module.
 *
 * Twilio sandbox (dev): set TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
 * Production: set TWILIO_WHATSAPP_FROM=whatsapp:+<your-approved-number>
 */

import Twilio from 'twilio';

type TwilioClient = ReturnType<typeof Twilio>;

let twilioClient: TwilioClient | null = null;

function getClient(): TwilioClient | null {
  if (twilioClient) return twilioClient;
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || sid === 'placeholder') return null;
  twilioClient = Twilio(sid, token);
  return twilioClient;
}

function from(): string {
  return process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886';
}

function toWA(number: string): string {
  // Normalise: strip spaces/dashes, ensure +, prepend whatsapp:
  const clean = number.replace(/[\s\-()]/g, '');
  const e164  = clean.startsWith('+') ? clean : `+${clean}`;
  return `whatsapp:${e164}`;
}

interface SendResult { ok: boolean; sid?: string; error?: string }

async function sendWA(to: string, body: string): Promise<SendResult> {
  const client = getClient();
  if (!client) {
    console.info(`[whatsapp] Twilio not configured — skipping WA to ${to}`);
    return { ok: true };
  }
  try {
    const msg = await client.messages.create({ from: from(), to: toWA(to), body });
    return { ok: true, sid: msg.sid };
  } catch (e: unknown) {
    const msg = (e as Error).message;
    console.error('[whatsapp] send failed:', msg);
    return { ok: false, error: msg };
  }
}

// ─── Guard helper ─────────────────────────────────────────────────────────────
// Returns null silently if number absent or not opted-in
function guard(number: string | null | undefined, optedIn: boolean | null | undefined): string | null {
  if (!number || !optedIn) return null;
  return number;
}

// ─── Absence alert ────────────────────────────────────────────────────────────

export async function whatsappAbsenceAlert({
  parentNumber, parentOptedIn,
  learnerName, programName, sessionDate,
}: {
  parentNumber:   string | null | undefined;
  parentOptedIn:  boolean | null | undefined;
  learnerName:    string;
  programName:    string;
  sessionDate:    string;
}) {
  const to = guard(parentNumber, parentOptedIn);
  if (!to) return;

  const body =
    `*Melisizwe Girls in STEM — Absence Notice*\n\n` +
    `Hi, we wanted to let you know that *${learnerName}* was marked absent from ` +
    `*${programName}* on ${sessionDate}.\n\n` +
    `If this was planned or if there are any concerns, please contact your programme coordinator. ` +
    `We are here to help! 💜`;

  await sendWA(to, body);
}

// ─── Re-engagement outreach ───────────────────────────────────────────────────

export async function whatsappReengagement({
  learnerNumber,  learnerOptedIn,  learnerName,
  parentNumber,   parentOptedIn,   parentName,
  triggerDetail,  programName,     coordinatorName,
}: {
  learnerNumber:   string | null | undefined;
  learnerOptedIn:  boolean | null | undefined;
  learnerName:     string;
  parentNumber:    string | null | undefined;
  parentOptedIn:   boolean | null | undefined;
  parentName:      string | null | undefined;
  triggerDetail:   string;
  programName:     string;
  coordinatorName: string;
}) {
  const sends: Promise<SendResult>[] = [];

  const learnerTo = guard(learnerNumber, learnerOptedIn);
  if (learnerTo) {
    const firstName = learnerName.split(' ')[0];
    sends.push(sendWA(learnerTo,
      `*Melisizwe Girls in STEM* 💜\n\n` +
      `Hi ${firstName}! We've noticed you've been a bit quiet lately (${triggerDetail}) ` +
      `and wanted to check in.\n\n` +
      `No matter what's going on — transport, home, confidence — your coordinator ` +
      `*${coordinatorName}* is here to help. Please reach out! 🌟\n\n` +
      `You belong in this programme. We miss you! 💪`
    ));
  }

  const parentTo = guard(parentNumber, parentOptedIn);
  if (parentTo) {
    const pName = parentName ?? 'Parent/Guardian';
    sends.push(sendWA(parentTo,
      `*Melisizwe Girls in STEM — Check-in for ${learnerName}*\n\n` +
      `Dear ${pName}, we noticed: ${triggerDetail}.\n\n` +
      `If there are any barriers to ${learnerName}'s participation, please contact ` +
      `coordinator *${coordinatorName}*. We want to support your child. 💜`
    ));
  }

  await Promise.all(sends);
}

// ─── Monthly progress summary ─────────────────────────────────────────────────

export async function whatsappMonthlySummary({
  parentNumber, parentOptedIn,
  parentName, children,
}: {
  parentNumber:  string | null | undefined;
  parentOptedIn: boolean | null | undefined;
  parentName:    string;
  children: Array<{
    name:      string;
    grade:     number;
    attRate:   number;
    avgScore:  number;
    riskLevel: string;
  }>;
}) {
  const to = guard(parentNumber, parentOptedIn);
  if (!to) return;

  const childLines = children.map(c => {
    const attEmoji  = c.attRate >= 75 ? '✅' : '⚠️';
    const riskEmoji = c.riskLevel === 'high' ? '🔴' : c.riskLevel === 'medium' ? '🟡' : '🟢';
    return (
      `*${c.name}* (Grade ${c.grade})\n` +
      `  ${attEmoji} Attendance: ${Math.round(c.attRate)}%\n` +
      `  📊 Avg Score: ${Math.round(c.avgScore)}%\n` +
      `  ${riskEmoji} Risk: ${c.riskLevel}`
    );
  }).join('\n\n');

  const body =
    `*Melisizwe Girls in STEM — Monthly Update* 📚\n\n` +
    `Dear ${parentName},\n\n` +
    childLines +
    `\n\n` +
    `Questions? Reply to this message or contact the programme coordinator. 💜`;

  await sendWA(to, body);
}
