export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const resend   = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const FROM     = process.env.RESEND_FROM_EMAIL ?? 'Girls in STEM <noreply@girlsstem.org>';

  // Fetch all parents with linked learners
  const { data: parents } = await supabase
    .from('users')
    .select('user_id, full_name, email')
    .eq('role', 'parent');

  if (!parents?.length) return NextResponse.json({ ok: true, sent: 0 });

  let sent = 0;

  for (const parent of parents as { user_id: string; full_name: string; email: string }[]) {
    const { data: children } = await supabase
      .from('learners')
      .select(`
        learner_id, grade,
        learner_profiles(first_name, last_name),
        schools(school_name),
        risk_scores(risk_level, attendance_rate, avg_score),
        attendance(status, session_date),
        assessments(percentage, assessment_date)
      `)
      .eq('parent_id', parent.user_id)
      .eq('programme_status', 'active');

    if (!children?.length || !parent.email) continue;

    type ChildRow = { learner_id: string; grade: number; learner_profiles: { first_name: string; last_name: string } | null; schools: { school_name: string } | null; risk_scores: { risk_level: string; attendance_rate: number; avg_score: number } | null; attendance: Array<{ status: string; session_date: string }>; assessments: Array<{ percentage: number; assessment_date: string }> };
    const kids = children as unknown as ChildRow[];

    const childSections = kids.map(c => {
      const name    = `${c.learner_profiles?.first_name ?? ''} ${c.learner_profiles?.last_name ?? ''}`.trim();
      const att     = c.risk_scores?.attendance_rate ?? 0;
      const score   = c.risk_scores?.avg_score ?? 0;
      const risk    = c.risk_scores?.risk_level ?? 'low';
      const attColor = att >= 75 ? '#059669' : '#dc2626';
      const riskColor = risk === 'high' ? '#dc2626' : risk === 'medium' ? '#d97706' : '#059669';

      return `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;">
          <h3 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">${name}</h3>
          <p style="margin:0 0 4px;font-size:13px;color:#475569;">Grade ${c.grade} · ${c.schools?.school_name ?? ''}</p>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:12px;">
            <div style="text-align:center;padding:10px;background:#fff;border-radius:8px;border:1px solid #e2e8f0;">
              <p style="margin:0;font-size:22px;font-weight:900;color:${attColor};">${Math.round(att)}%</p>
              <p style="margin:2px 0 0;font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">Attendance</p>
            </div>
            <div style="text-align:center;padding:10px;background:#fff;border-radius:8px;border:1px solid #e2e8f0;">
              <p style="margin:0;font-size:22px;font-weight:900;color:#1D4ED8;">${Math.round(score)}%</p>
              <p style="margin:2px 0 0;font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">Avg Score</p>
            </div>
            <div style="text-align:center;padding:10px;background:#fff;border-radius:8px;border:1px solid #e2e8f0;">
              <p style="margin:0;font-size:16px;font-weight:900;color:${riskColor};text-transform:capitalize;">${risk}</p>
              <p style="margin:2px 0 0;font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">Risk Level</p>
            </div>
          </div>
          ${att < 75 ? '<p style="margin:12px 0 0;font-size:12px;color:#dc2626;font-weight:600;">⚠️ Attendance is below the 75% target — please encourage regular attendance.</p>' : ''}
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:linear-gradient(135deg,#7C3AED,#6D28D9);padding:24px 32px;">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.1em;color:rgba(196,181,253,0.8);text-transform:uppercase;">Melisizwe Girls in STEM</p>
          <h1 style="margin:8px 0 0;font-size:20px;font-weight:800;color:#fff;">Monthly Progress Summary</h1>
        </div>
        <div style="padding:28px 32px;">
          <p style="color:#475569;font-size:14px;margin:0 0 20px;">
            Dear ${parent.full_name || 'Parent/Guardian'},<br/><br/>
            Here is your monthly summary of ${kids.length === 1 ? 'your child' : 'your children'}'s progress in the Girls in STEM programme.
          </p>
          ${childSections}
          <a href="${appUrl}/parent" style="display:inline-block;margin-top:8px;padding:12px 24px;background:linear-gradient(135deg,#7C3AED,#6D28D9);color:#fff;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">
            View Full Dashboard →
          </a>
          <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;">
            Questions? Reply to this email or contact the programme coordinator.
          </p>
        </div>
      </div>
    </body></html>`;

    if (resend) {
      await resend.emails.send({ from: FROM, to: parent.email, subject: 'Your monthly Girls in STEM progress update', html }).catch(() => {});
      sent++;
    }
  }

  return NextResponse.json({ ok: true, sent });
}
