export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, ok, err, created } from '@/app/api/helpers';
import { Resend } from 'resend';

const schema = z.object({
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  report_type:  z.enum(['quarterly', 'annual', 'custom']).default('quarterly'),
  send_email:   z.boolean().default(false),
});

interface Params { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin', 'sponsor']);
  if (denied) return denied;

  const { data, error } = await supabase
    .from('sponsor_reports')
    .select('report_id, period_start, period_end, report_type, sent_at, created_at')
    .eq('sponsor_id', (await params).id)
    .order('period_start', { ascending: false });

  if (error) return err(error.message, 500);
  return ok(data);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin']);
  if (denied) return denied;

  const sponsorId = (await params).id;
  const body      = await req.json();
  const parsed    = schema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);
  const { period_start, period_end, report_type, send_email } = parsed.data;

  // ── Gather report data ──────────────────────────────────────────────────────
  const [sponsorRes, linksRes] = await Promise.all([
    supabase.from('sponsors').select('sponsor_name, contact_name, contact_email').eq('sponsor_id', sponsorId).single(),
    supabase.from('sponsor_learners').select('learner_id').eq('sponsor_id', sponsorId),
  ]);

  const sponsor    = sponsorRes.data as { sponsor_name: string; contact_name: string; contact_email: string } | null;
  const learnerIds = (linksRes.data || []).map(l => l.learner_id);

  if (!sponsor) return err('Sponsor not found', 404);

  const content: Record<string, unknown> = { learner_count: learnerIds.length };

  if (learnerIds.length > 0) {
    const [attRes, assRes, intRes, mentorRes, riskRes] = await Promise.all([
      supabase.from('attendance').select('learner_id, status, session_date')
        .in('learner_id', learnerIds)
        .gte('session_date', period_start).lte('session_date', period_end),
      supabase.from('assessments').select('learner_id, percentage, assessment_date')
        .in('learner_id', learnerIds)
        .gte('assessment_date', period_start).lte('assessment_date', period_end),
      supabase.from('interventions').select('learner_id, status, created_at')
        .in('learner_id', learnerIds)
        .gte('created_at', period_start + 'T00:00:00').lte('created_at', period_end + 'T23:59:59'),
      supabase.from('mentorship_sessions').select('learner_id, session_date')
        .in('learner_id', learnerIds)
        .gte('session_date', period_start).lte('session_date', period_end),
      supabase.from('risk_scores').select('learner_id, risk_level, attendance_rate, avg_score')
        .in('learner_id', learnerIds),
    ]);

    const att      = attRes.data  || [];
    const ass      = assRes.data  || [];
    const interv   = intRes.data  || [];
    const sessions = mentorRes.data || [];
    const risks    = riskRes.data || [];

    const attRate  = att.length ? Math.round(att.filter(a => a.status === 'present').length / att.length * 100) : null;
    const avgScore = ass.length ? Math.round(ass.reduce((s, a) => s + Number(a.percentage || 0), 0) / ass.length) : null;
    const onTrack  = risks.filter(r => r.risk_level === 'low').length;
    const highRisk = risks.filter(r => r.risk_level === 'high').length;
    const resolved = interv.filter(i => i.status === 'resolved').length;

    // Per-learner score improvement
    const scoreMap: Record<string, number[]> = {};
    ass.forEach(a => {
      if (!scoreMap[a.learner_id]) scoreMap[a.learner_id] = [];
      scoreMap[a.learner_id].push(Number(a.percentage));
    });
    const improved = Object.values(scoreMap).filter(s => s.length >= 2 && s[s.length - 1] > s[0]).length;

    Object.assign(content, {
      sponsor_name:       sponsor.sponsor_name,
      period_start,
      period_end,
      report_type,
      learner_count:      learnerIds.length,
      attendance_rate:    attRate,
      avg_score:          avgScore,
      on_track:           onTrack,
      high_risk:          highRisk,
      improved_scores:    improved,
      mentorship_sessions: sessions.length,
      interventions_total: interv.length,
      interventions_resolved: resolved,
      generated_at:       new Date().toISOString(),
    });
  }

  // Save report record
  const { data: report, error: saveErr } = await supabase
    .from('sponsor_reports')
    .insert({ sponsor_id: sponsorId, period_start, period_end, report_type, content_json: content })
    .select()
    .single();

  if (saveErr) return err(saveErr.message, 500);

  const reportId  = (report as { report_id: string }).report_id;
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const reportUrl = `${appUrl}/api/v1/reports/sponsor/${reportId}`;

  // Optionally email the sponsor
  if (send_email && sponsor.contact_email) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const periodLabel = `${period_start} – ${period_end}`;
    await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL ?? 'Girls in STEM <noreply@girlsstem.org>',
      to:      sponsor.contact_email,
      subject: `Your ${report_type} impact report is ready — ${periodLabel}`,
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',sans-serif;">
        <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <div style="background:linear-gradient(135deg,#1D4ED8,#1e40af);padding:24px 32px;">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.1em;color:rgba(191,219,254,0.9);text-transform:uppercase;">Melisizwe Girls in STEM</p>
            <h1 style="margin:8px 0 0;font-size:20px;font-weight:800;color:#fff;">Your Impact Report</h1>
          </div>
          <div style="padding:28px 32px;">
            <p style="color:#475569;font-size:14px;margin:0 0 20px;">Dear ${sponsor.contact_name || sponsor.sponsor_name},</p>
            <p style="color:#475569;font-size:14px;margin:0 0 20px;">
              Your ${report_type} impact report for <strong>${periodLabel}</strong> is ready to view.
              It summarises the progress of the learners your organisation is supporting.
            </p>
            <a href="${reportUrl}" style="display:inline-block;padding:12px 28px;background:#1D4ED8;color:#fff;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;">
              View Impact Report →
            </a>
            <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;">
              Girls in STEM Platform · Thank you for your continued investment in the next generation.
            </p>
          </div>
        </div>
      </body></html>`,
    }).catch(() => {});

    await supabase.from('sponsor_reports').update({ sent_at: new Date().toISOString() }).eq('report_id', reportId);
  }

  return created({ report_id: reportId, report_url: reportUrl, content });
}
