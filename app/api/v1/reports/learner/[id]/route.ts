export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/app/api/helpers';

interface Params { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor', 'sponsor']);
  if (denied) return denied;

  const { id } = await params;

  const { data: learner } = await supabase
    .from('learners')
    .select(`
      learner_id, learner_code, grade, programme_status, enrollment_date,
      learner_profiles(first_name, last_name, email, phone, parent_name, parent_contact),
      schools(school_name, district, province),
      risk_scores(risk_level, attendance_rate, avg_score),
      program_enrollments(status, programs(program_name, program_type)),
      attendance(status),
      assessments(subject, percentage, grade_band, assessment_date, score, max_score, programs(program_name)),
      projects(project_name, stage, completion_status, score, max_score, programs(program_name)),
      interventions(status, reason, created_at),
      mentorship_sessions(session_date, notes)
    `)
    .eq('learner_id', id)
    .single();

  if (!learner) return new NextResponse('Learner not found', { status: 404 });

  const p        = (learner as any).learner_profiles;
  const school   = (learner as any).schools;
  const risk     = (learner as any).risk_scores;
  const att      = (learner as any).attendance || [];
  const ass      = ((learner as any).assessments || []).sort((a: any, b: any) => b.assessment_date?.localeCompare(a.assessment_date));
  const projects = (learner as any).projects || [];
  const progs    = ((learner as any).program_enrollments || []).filter((e: any) => e.status === 'active');

  const attRate  = att.length ? Math.round(att.filter((a: any) => a.status === 'present').length / att.length * 100) : 0;
  const avgScore = ass.length ? Math.round(ass.reduce((s: number, a: any) => s + Number(a.percentage || 0), 0) / ass.length) : 0;

  const riskColor = { high: '#DC2626', medium: '#D97706', low: '#16A34A' }[(risk?.risk_level || 'low') as string] || '#16A34A';
  const attColor  = attRate >= 75 ? '#16A34A' : attRate >= 60 ? '#D97706' : '#DC2626';
  const scoreColor = avgScore >= 70 ? '#16A34A' : avgScore >= 50 ? '#D97706' : '#DC2626';

  const bandColor = (band: string) => ({
    'Distinction':   '#16A34A',
    'Merit':         '#2563EB',
    'Pass':          '#D97706',
    'Needs Support': '#DC2626',
  }[band] || '#6B7280');

  const stageLabel = (s: string) => ({
    planning: 'Planning', in_progress: 'In Progress', review: 'Under Review',
    submitted: 'Submitted', marked: 'Marked',
  }[s] || s);

  const today = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Learner Report — ${p?.first_name} ${p?.last_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; }
    @page { margin: 15mm; size: A4; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .no-print { display: none; } }

    /* Print button */
    .print-bar { background: #4F2D7F; color: white; padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; }
    .print-bar button { background: white; color: #4F2D7F; border: none; padding: 6px 16px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 12px; }

    /* Header */
    .header { background: linear-gradient(135deg, #4F2D7F 0%, #2DD4A0 100%); color: white; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; }
    .header-left h1 { font-size: 20px; font-weight: 800; }
    .header-left p  { font-size: 11px; opacity: 0.8; margin-top: 2px; }
    .header-right   { text-align: right; font-size: 10px; opacity: 0.9; }
    .learner-code   { background: rgba(255,255,255,0.2); padding: 3px 10px; border-radius: 20px; font-family: monospace; font-weight: 700; font-size: 13px; margin-top: 4px; display: inline-block; }

    /* Body */
    .body { padding: 20px 24px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-bottom: 16px; }

    /* Cards */
    .card { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 10px; padding: 12px 14px; }
    .card-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6c757d; margin-bottom: 4px; }

    /* KPI cards */
    .kpi { text-align: center; padding: 12px 8px; }
    .kpi-value { font-size: 26px; font-weight: 800; line-height: 1; }
    .kpi-label { font-size: 9px; color: #6c757d; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.05em; }

    /* Section */
    .section { margin-bottom: 18px; }
    .section-title { font-size: 11px; font-weight: 700; color: #4F2D7F; border-bottom: 2px solid #4F2D7F; padding-bottom: 4px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.06em; }

    /* Info rows */
    .info-row { display: flex; gap: 6px; margin-bottom: 4px; }
    .info-label { font-weight: 600; color: #6c757d; min-width: 100px; }

    /* Table */
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #4F2D7F; color: white; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
    td { padding: 5px 8px; border-bottom: 1px solid #f0f0f0; }
    tr:nth-child(even) td { background: #f8f9fa; }

    /* Badges */
    .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 9px; font-weight: 700; }

    /* Risk badge */
    .risk-high   { background: #FEE2E2; color: #DC2626; }
    .risk-medium { background: #FEF3C7; color: #D97706; }
    .risk-low    { background: #DCFCE7; color: #16A34A; }

    /* Footer */
    .footer { background: #f8f9fa; border-top: 1px solid #e9ecef; padding: 10px 24px; display: flex; justify-content: space-between; font-size: 9px; color: #9ca3af; margin-top: 8px; }

    /* Progress bar */
    .bar-track { background: #e9ecef; border-radius: 4px; height: 8px; overflow: hidden; }
    .bar-fill  { height: 100%; border-radius: 4px; }

    /* Page break hint */
    .avoid-break { break-inside: avoid; }
  </style>
</head>
<body>

<!-- Print bar (hidden when printing) -->
<div class="print-bar no-print">
  <span>📋 Learner Report Card — ${p?.first_name} ${p?.last_name}</span>
  <button onclick="window.print()">🖨 Print / Save as PDF</button>
</div>

<!-- Report Header -->
<div class="header">
  <div class="header-left">
    <h1>Girls in STEM</h1>
    <p>Learner Progress Report</p>
    <div class="learner-code">${(learner as any).learner_code}</div>
  </div>
  <div class="header-right">
    <div style="font-size:14px; font-weight:800;">${p?.first_name || ''} ${p?.last_name || ''}</div>
    <div>Grade ${(learner as any).grade} &nbsp;·&nbsp; ${school?.school_name || '—'}</div>
    <div style="margin-top:4px; opacity:0.7">Generated ${today}</div>
  </div>
</div>

<div class="body">

  <!-- KPI Strip -->
  <div class="grid-4">
    <div class="card kpi avoid-break">
      <div class="kpi-value" style="color:${attColor}">${attRate}%</div>
      <div class="kpi-label">Attendance</div>
      <div class="bar-track" style="margin-top:6px"><div class="bar-fill" style="width:${attRate}%;background:${attColor}"></div></div>
    </div>
    <div class="card kpi avoid-break">
      <div class="kpi-value" style="color:${scoreColor}">${avgScore}%</div>
      <div class="kpi-label">Avg Score</div>
      <div class="bar-track" style="margin-top:6px"><div class="bar-fill" style="width:${avgScore}%;background:${scoreColor}"></div></div>
    </div>
    <div class="card kpi avoid-break">
      <div class="kpi-value" style="color:#4F2D7F">${ass.length}</div>
      <div class="kpi-label">Assessments</div>
    </div>
    <div class="card kpi avoid-break">
      <div class="kpi-value" style="color:${riskColor}">${(risk?.risk_level || 'low').toUpperCase()}</div>
      <div class="kpi-label">Risk Level</div>
    </div>
  </div>

  <!-- Learner & School Info -->
  <div class="grid-2 avoid-break">
    <div class="card">
      <div class="card-title">Learner Information</div>
      <div class="info-row"><span class="info-label">Full Name:</span><span>${p?.first_name || ''} ${p?.last_name || ''}</span></div>
      <div class="info-row"><span class="info-label">Learner Code:</span><span style="font-family:monospace;font-weight:700">${(learner as any).learner_code}</span></div>
      <div class="info-row"><span class="info-label">Grade:</span><span>Grade ${(learner as any).grade}</span></div>
      <div class="info-row"><span class="info-label">Status:</span><span>${(learner as any).programme_status}</span></div>
      ${p?.email ? `<div class="info-row"><span class="info-label">Email:</span><span>${p.email}</span></div>` : ''}
      ${p?.phone ? `<div class="info-row"><span class="info-label">Phone:</span><span>${p.phone}</span></div>` : ''}
    </div>
    <div class="card">
      <div class="card-title">School & Parent</div>
      <div class="info-row"><span class="info-label">School:</span><span>${school?.school_name || '—'}</span></div>
      <div class="info-row"><span class="info-label">District:</span><span>${school?.district || '—'}</span></div>
      <div class="info-row"><span class="info-label">Province:</span><span>${school?.province || '—'}</span></div>
      ${p?.parent_name ? `<div class="info-row" style="margin-top:6px"><span class="info-label">Parent/Guardian:</span><span>${p.parent_name}</span></div>` : ''}
      ${p?.parent_contact ? `<div class="info-row"><span class="info-label">Contact:</span><span>${p.parent_contact}</span></div>` : ''}
    </div>
  </div>

  <!-- Programmes -->
  ${progs.length > 0 ? `
  <div class="section avoid-break">
    <div class="section-title">Enrolled Programmes</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${progs.map((e: any) => `
        <div style="background:#EDE9FE;border:1px solid #C4B5FD;border-radius:8px;padding:6px 12px">
          <div style="font-weight:700;color:#5B21B6;font-size:11px">${e.programs?.program_name}</div>
          <div style="color:#7C3AED;font-size:9px">${e.programs?.program_type}</div>
        </div>
      `).join('')}
    </div>
  </div>` : ''}

  <!-- Assessments -->
  ${ass.length > 0 ? `
  <div class="section avoid-break">
    <div class="section-title">Assessment Results (${ass.length} total)</div>
    <table>
      <thead><tr><th>Date</th><th>Subject</th><th>Programme</th><th>Score</th><th>%</th><th>Grade</th></tr></thead>
      <tbody>
        ${ass.slice(0, 15).map((a: any) => `
          <tr>
            <td>${a.assessment_date ? new Date(a.assessment_date).toLocaleDateString('en-ZA') : '—'}</td>
            <td style="font-weight:600">${a.subject || '—'}</td>
            <td style="color:#6c757d">${(a.programs as any)?.program_name || '—'}</td>
            <td style="font-family:monospace">${a.score ?? '—'}/${a.max_score ?? 100}</td>
            <td style="font-weight:700;color:${bandColor(a.grade_band)}">${a.percentage ?? '—'}%</td>
            <td><span class="badge" style="background:${bandColor(a.grade_band)}20;color:${bandColor(a.grade_band)}">${a.grade_band || '—'}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ${ass.length > 15 ? `<p style="font-size:9px;color:#9ca3af;margin-top:4px;text-align:right">Showing 15 of ${ass.length} assessments</p>` : ''}
  </div>` : ''}

  <!-- Projects -->
  ${projects.length > 0 ? `
  <div class="section avoid-break">
    <div class="section-title">Projects (${projects.length})</div>
    <table>
      <thead><tr><th>Project</th><th>Programme</th><th>Stage</th><th>Score</th></tr></thead>
      <tbody>
        ${projects.map((p: any) => {
          const pct = p.score != null ? Math.round((p.score / (p.max_score || 100)) * 100) : null;
          return `<tr>
            <td style="font-weight:600">${p.project_name}</td>
            <td style="color:#6c757d">${(p.programs as any)?.program_name || '—'}</td>
            <td>${stageLabel(p.stage || p.completion_status)}</td>
            <td style="font-weight:700;color:${pct !== null ? (pct >= 75 ? '#16A34A' : pct >= 50 ? '#D97706' : '#DC2626') : '#6c757d'}">
              ${pct !== null ? `${pct}%` : '—'}
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>` : ''}

  <!-- Attendance summary -->
  <div class="section avoid-break">
    <div class="section-title">Attendance Summary</div>
    <div class="grid-4">
      ${['present','absent','late','excused'].map(s => {
        const count = att.filter((a: any) => a.status === s).length;
        const colors: Record<string,string> = { present:'#16A34A', absent:'#DC2626', late:'#D97706', excused:'#2563EB' };
        return `<div class="card kpi">
          <div class="kpi-value" style="color:${colors[s]};font-size:20px">${count}</div>
          <div class="kpi-label" style="text-transform:capitalize">${s}</div>
        </div>`;
      }).join('')}
    </div>
    <div style="margin-top:4px">
      <div style="display:flex;justify-content:space-between;font-size:9px;margin-bottom:3px">
        <span>Overall Attendance Rate</span><span style="font-weight:700;color:${attColor}">${attRate}%</span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${attRate}%;background:${attColor}"></div></div>
      ${attRate < 75 ? '<p style="color:#DC2626;font-size:9px;margin-top:4px">⚠ Below minimum attendance requirement of 75%</p>' : ''}
    </div>
  </div>

</div>

<!-- Footer -->
<div class="footer">
  <span>Girls in STEM Digital Platform &nbsp;·&nbsp; Confidential</span>
  <span>Report generated ${today} &nbsp;·&nbsp; ${(learner as any).learner_code}</span>
</div>

<script>
  // Auto-highlight low attendance
  document.addEventListener('DOMContentLoaded', function() {
    console.log('Report card ready — use Print button or Ctrl+P to save as PDF');
  });
</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}