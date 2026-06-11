export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Params { params: Promise<{ id: string }> }

function bar(pct: number, color: string) {
  return `<div style="background:#e2e8f0;border-radius:999px;height:8px;overflow:hidden;margin-top:4px;">
    <div style="width:${Math.min(pct, 100)}%;height:100%;background:${color};border-radius:999px;"></div>
  </div>`;
}

function kpi(label: string, value: string | number, color: string, sub?: string) {
  return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;text-align:center;">
    <p style="margin:0;font-size:28px;font-weight:900;color:${color};">${value}</p>
    ${sub ? `<p style="margin:2px 0 0;font-size:11px;color:#94a3b8;">${sub}</p>` : ''}
    <p style="margin:4px 0 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;">${label}</p>
  </div>`;
}

function narrative(icon: string, text: string) {
  return `<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid #f1f5f9;">
    <span style="font-size:20px;line-height:1.4;">${icon}</span>
    <p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">${text}</p>
  </div>`;
}

export async function GET(_: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { id }   = await params;

  const { data: report, error } = await supabase
    .from('sponsor_reports')
    .select(`*, sponsors(sponsor_name, contact_name)`)
    .eq('report_id', id)
    .single();

  if (error || !report) {
    return new NextResponse('Report not found', { status: 404 });
  }

  type ReportRow = { report_id: string; period_start: string; period_end: string; report_type: string; content_json: Record<string, unknown>; created_at: string; sponsors: { sponsor_name: string; contact_name: string } | null };
  const r  = report as unknown as ReportRow;
  const c  = r.content_json as Record<string, number | string | null>;
  const sp = r.sponsors;

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
  const pct = (n: number | null | undefined) => n != null ? `${n}%` : '—';
  const num = (n: number | null | undefined) => n != null ? String(n) : '—';

  // Build narrative sentences
  const narratives: string[] = [];
  if (c.learner_count) narratives.push(`Your organisation is sponsoring <strong>${c.learner_count} learner${Number(c.learner_count) !== 1 ? 's' : ''}</strong> in the Melisizwe Girls in STEM programme.`);
  if (c.attendance_rate != null) narratives.push(`Overall session attendance for this period was <strong style="color:${Number(c.attendance_rate) >= 75 ? '#059669' : '#dc2626'}">${c.attendance_rate}%</strong> — ${Number(c.attendance_rate) >= 80 ? 'an excellent result showing real commitment' : Number(c.attendance_rate) >= 75 ? 'meeting the programme target' : 'below target — the team is following up on absences'}.`);
  if (c.improved_scores != null && Number(c.improved_scores) > 0) narratives.push(`<strong>${c.improved_scores} learner${Number(c.improved_scores) !== 1 ? 's' : ''}</strong> showed measurable academic improvement during this period.`);
  if (c.mentorship_sessions != null) narratives.push(`<strong>${c.mentorship_sessions} one-on-one mentorship session${Number(c.mentorship_sessions) !== 1 ? 's' : ''}</strong> were logged — providing personalised guidance and support.`);
  if (c.interventions_total != null && Number(c.interventions_total) > 0) narratives.push(`${Number(c.interventions_resolved) === Number(c.interventions_total) ? 'All' : `<strong>${c.interventions_resolved} of ${c.interventions_total}</strong>`} support interventions raised during this period ${Number(c.interventions_resolved) === Number(c.interventions_total) ? 'have been fully resolved' : 'have been resolved or are actively managed'}.`);
  if (c.on_track != null) narratives.push(`<strong style="color:#059669">${c.on_track} learner${Number(c.on_track) !== 1 ? 's' : ''}</strong> ${Number(c.on_track) !== 1 ? 'are' : 'is'} on track for programme completion based on current attendance and academic performance.`);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Impact Report — ${sp?.sponsor_name ?? 'Sponsor'}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #fff; font-family: 'Segoe UI', system-ui, sans-serif; color: #1e293b; }
    @media print {
      .no-print { display: none !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body style="max-width:720px;margin:0 auto;padding:40px 32px 60px;">

  <!-- Print button -->
  <div class="no-print" style="text-align:right;margin-bottom:20px;">
    <button onclick="window.print()" style="background:#1D4ED8;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">
      ↓ Save / Print PDF
    </button>
  </div>

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1D4ED8,#1e40af);border-radius:16px;padding:32px;color:#fff;margin-bottom:32px;">
    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(191,219,254,0.9);">
      Melisizwe Girls in STEM Programme
    </p>
    <h1 style="margin:8px 0 4px;font-size:26px;font-weight:900;">${r.report_type.charAt(0).toUpperCase() + r.report_type.slice(1)} Impact Report</h1>
    <p style="margin:0;font-size:14px;color:rgba(191,219,254,0.9);">${sp?.sponsor_name ?? ''}</p>
    <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">
      ${fmt(r.period_start)} — ${fmt(r.period_end)}
    </p>
  </div>

  <!-- KPI grid -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:32px;">
    ${kpi('Learners Supported', num(c.learner_count as number), '#1D4ED8')}
    ${kpi('Attendance Rate', pct(c.attendance_rate as number), Number(c.attendance_rate) >= 75 ? '#059669' : '#dc2626', 'Target: 75%+')}
    ${kpi('Average Score', pct(c.avg_score as number), Number(c.avg_score) >= 60 ? '#059669' : '#f59e0b', 'Across all assessments')}
    ${kpi('On Track', num(c.on_track as number), '#059669', 'Low risk learners')}
    ${kpi('Mentorship Sessions', num(c.mentorship_sessions as number), '#7C3AED', 'This period')}
    ${kpi('Interventions Resolved', `${num(c.interventions_resolved as number)} / ${num(c.interventions_total as number)}`, '#059669', 'Support cases')}
  </div>

  <!-- Progress bars -->
  ${c.attendance_rate != null || c.avg_score != null ? `
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:32px;">
    <p style="margin:0 0 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;">Performance Overview</p>
    ${c.attendance_rate != null ? `
    <div style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:13px;font-weight:600;color:#475569;">Attendance Rate</span>
        <span style="font-size:13px;font-weight:700;color:${Number(c.attendance_rate) >= 75 ? '#059669' : '#dc2626'};">${c.attendance_rate}%</span>
      </div>
      ${bar(Number(c.attendance_rate), Number(c.attendance_rate) >= 75 ? '#059669' : '#dc2626')}
    </div>` : ''}
    ${c.avg_score != null ? `
    <div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:13px;font-weight:600;color:#475569;">Average Score</span>
        <span style="font-size:13px;font-weight:700;color:${Number(c.avg_score) >= 60 ? '#059669' : '#f59e0b'};">${c.avg_score}%</span>
      </div>
      ${bar(Number(c.avg_score), Number(c.avg_score) >= 60 ? '#059669' : '#f59e0b')}
    </div>` : ''}
  </div>` : ''}

  <!-- Narrative -->
  <div style="margin-bottom:32px;">
    <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;">Your Impact This Period</p>
    ${narratives.map(n => narrative('✦', n)).join('')}
  </div>

  <!-- Footer -->
  <div style="border-top:1px solid #e2e8f0;padding-top:20px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">
      Generated ${new Date(r.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })} · Melisizwe Girls in STEM Platform
    </p>
    <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1;">Thank you for investing in the next generation of African women in STEM.</p>
  </div>

</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
