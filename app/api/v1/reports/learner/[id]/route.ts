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
      assessments(subject, percentage, grade_band, assessment_date, score, max_score, assessment_type, notes, term, programs(program_name)),
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
  const ass      = ((learner as any).assessments || []).sort((a: any, b: any) =>
    (b.assessment_date || '').localeCompare(a.assessment_date || ''));
  const projects = (learner as any).projects || [];
  const progs    = ((learner as any).program_enrollments || []).filter((e: any) => e.status === 'active');
  const mentorship = ((learner as any).mentorship_sessions || []).slice(0, 5);

  const attRate  = att.length ? Math.round(att.filter((a: any) => a.status === 'present').length / att.length * 100) : 0;
  const avgScore = ass.length ? Math.round(ass.reduce((s: number, a: any) => s + Number(a.percentage || 0), 0) / ass.length) : 0;
  const riskLevel = (risk?.risk_level || 'low') as string;

  const scoreCol = (v: number) => v >= 80 ? '#10B981' : v >= 70 ? '#7C3AED' : v >= 50 ? '#F59E0B' : '#EF4444';
  const attCol   = attRate >= 75 ? '#10B981' : attRate >= 60 ? '#F59E0B' : '#EF4444';
  const riskCol  = { high: '#EF4444', medium: '#F59E0B', low: '#10B981' }[riskLevel] || '#10B981';
  const riskBg   = { high: '#FEF2F2', medium: '#FFFBEB', low: '#ECFDF5' }[riskLevel] || '#ECFDF5';

  const bandCol  = (b: string) => ({ Distinction:'#7C3AED', Merit:'#10B981', Pass:'#F59E0B', 'Needs Support':'#EF4444' }[b] || '#64748B');
  const bandBg   = (b: string) => ({ Distinction:'#F5F3FF', Merit:'#ECFDF5', Pass:'#FFFBEB', 'Needs Support':'#FEF2F2' }[b] || '#F8FAFC');

  const stageLabel = (s: string) => ({
    planning:'Planning', in_progress:'In Progress', review:'Under Review',
    submitted:'Submitted', marked:'Marked ✓', completed:'Completed ✓', not_started:'Not Started',
  }[s] || s);
  const stageBg  = (s: string) => ({
    planning:'#F8FAFC', in_progress:'#FFFBEB', review:'#F5F3FF',
    submitted:'#EFF6FF', marked:'#ECFDF5', completed:'#ECFDF5',
  }[s] || '#F8FAFC');
  const stageCol = (s: string) => ({
    planning:'#64748B', in_progress:'#D97706', review:'#7C3AED',
    submitted:'#2563EB', marked:'#059669', completed:'#059669',
  }[s] || '#64748B');

  const today = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
  const fullName = `${p?.first_name || ''} ${p?.last_name || ''}`.trim();
  const initials = `${p?.first_name?.[0] || ''}${p?.last_name?.[0] || ''}`.toUpperCase();

  // Grade distribution from assessments
  const bands: Record<string,number> = { Distinction:0, Merit:0, Pass:0, 'Needs Support':0 };
  ass.forEach((a: any) => { if (a.grade_band && bands[a.grade_band] !== undefined) bands[a.grade_band]++; });

  // Subject breakdown
  const subjectMap: Record<string, number[]> = {};
  ass.forEach((a: any) => {
    if (!subjectMap[a.subject]) subjectMap[a.subject] = [];
    subjectMap[a.subject].push(Number(a.percentage || 0));
  });
  const subjects = Object.entries(subjectMap).map(([name, scores]) => ({
    name, count: scores.length,
    avg: Math.round(scores.reduce((s,v)=>s+v,0)/scores.length),
  })).sort((a,b) => b.count - a.count);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Learner Report — ${fullName}</title>
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Inter', Arial, sans-serif;
      font-size: 11.5px;
      color: #0F172A;
      background: #F1F5F9;
      line-height: 1.5;
    }

    @page { margin: 12mm 14mm; size: A4; }
    @media print {
      body { background: #fff; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
      .avoid-break { break-inside: avoid; }
    }

    /* ── Action Bar ─────────────────────────────────────────────────── */
    .action-bar {
      background: #0F172A;
      color: rgba(255,255,255,0.7);
      padding: 10px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-size: 12px;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .action-bar-left { display: flex; align-items: center; gap: 10px; }
    .action-bar-logo {
      width: 28px; height: 28px; border-radius: 7px;
      background: linear-gradient(135deg, #7C3AED, #A78BFA);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 900; font-size: 13px; flex-shrink: 0;
    }
    .action-bar-title { font-weight: 600; color: rgba(255,255,255,0.9); }
    .action-bar-sub { font-size: 10px; color: rgba(255,255,255,0.4); }
    .btn-print {
      background: #7C3AED; color: #fff; border: none;
      padding: 7px 18px; border-radius: 8px;
      font-weight: 700; cursor: pointer; font-size: 12px;
      display: flex; align-items: center; gap: 6px;
      transition: background 0.15s;
    }
    .btn-print:hover { background: #6D28D9; }

    /* ── Report wrapper ─────────────────────────────────────────────── */
    .report {
      max-width: 900px;
      margin: 24px auto;
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.1);
    }
    @media print { .report { max-width:100%; margin:0; border-radius:0; box-shadow:none; } }

    /* ── Header ─────────────────────────────────────────────────────── */
    .header {
      background: linear-gradient(135deg, #0F172A 0%, #1E1B4B 40%, #312E81 70%, #4C1D95 100%);
      padding: 28px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -40px; right: -40px;
      width: 220px; height: 220px;
      border-radius: 50%;
      background: rgba(124,58,237,0.2);
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: -60px; left: 30%;
      width: 280px; height: 280px;
      border-radius: 50%;
      background: rgba(45,212,160,0.08);
    }
    .header-brand { display:flex; align-items:center; gap:14px; position:relative; z-index:1; }
    .header-avatar {
      width: 52px; height: 52px; border-radius: 14px;
      background: linear-gradient(135deg,#7C3AED,#A78BFA);
      display:flex; align-items:center; justify-content:center;
      color:#fff; font-weight:900; font-size:18px; flex-shrink:0;
      box-shadow: 0 4px 12px rgba(124,58,237,0.4);
    }
    .header-brand-text h1 { font-size:22px; font-weight:900; color:#fff; letter-spacing:-0.5px; }
    .header-brand-text p  { font-size:11px; color:rgba(255,255,255,0.55); margin-top:1px; }
    .header-code {
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.2);
      color: rgba(255,255,255,0.9);
      padding: 4px 12px; border-radius: 20px;
      font-family: 'Courier New', monospace;
      font-weight: 700; font-size: 12px;
      display: inline-block; margin-top: 6px;
    }
    .header-learner { text-align:right; position:relative; z-index:1; }
    .header-learner-name { font-size:18px; font-weight:800; color:#fff; letter-spacing:-0.3px; }
    .header-learner-meta { font-size:11px; color:rgba(255,255,255,0.6); margin-top:3px; }
    .header-learner-date { font-size:10px; color:rgba(255,255,255,0.35); margin-top:5px; }
    .grade-chip {
      display:inline-block;
      background:rgba(124,58,237,0.35);
      border:1px solid rgba(167,139,250,0.4);
      color:#C4B5FD; padding:3px 10px; border-radius:20px;
      font-size:11px; font-weight:700; margin-top:6px;
    }

    /* ── Body ───────────────────────────────────────────────────────── */
    .body { padding: 24px 28px; }

    /* ── KPI Strip ──────────────────────────────────────────────────── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .kpi-card {
      border-radius: 12px;
      padding: 14px 12px;
      background: #FAFAFA;
      border: 1px solid #E2E8F0;
      text-align: center;
    }
    .kpi-value { font-size: 28px; font-weight: 900; line-height: 1; letter-spacing: -1px; }
    .kpi-label { font-size: 9px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; font-weight: 600; }
    .kpi-bar { height: 5px; border-radius: 3px; background: #E2E8F0; margin-top: 8px; overflow:hidden; }
    .kpi-bar-fill { height: 100%; border-radius: 3px; }

    /* ── Section ────────────────────────────────────────────────────── */
    .section { margin-bottom: 20px; }
    .section-title {
      font-size: 10px; font-weight: 800;
      text-transform: uppercase; letter-spacing: 0.1em;
      color: #7C3AED;
      padding-bottom: 6px;
      border-bottom: 2px solid #EDE9FE;
      margin-bottom: 12px;
      display: flex; align-items: center; gap: 6px;
    }
    .section-title-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #7C3AED; flex-shrink: 0;
    }
    .section-count {
      font-size: 9px; background: #EDE9FE; color: #7C3AED;
      padding: 1px 7px; border-radius: 10px; font-weight: 700;
      margin-left: auto;
    }

    /* ── Info grid ──────────────────────────────────────────────────── */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .info-card { background: #FAFAFA; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; }
    .info-card-title {
      font-size: 9px; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.08em; color: #94A3B8; margin-bottom: 10px;
    }
    .info-row { display: flex; gap: 8px; margin-bottom: 5px; font-size: 11px; }
    .info-label { color: #64748B; font-weight: 500; min-width: 110px; flex-shrink: 0; }
    .info-value { color: #0F172A; font-weight: 600; }

    /* ── Programmes ─────────────────────────────────────────────────── */
    .prog-chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .prog-chip {
      background: #F5F3FF; border: 1px solid #DDD6FE;
      border-radius: 10px; padding: 8px 14px;
    }
    .prog-chip-name { font-weight: 700; color: #5B21B6; font-size: 12px; }
    .prog-chip-type { color: #7C3AED; font-size: 10px; margin-top: 1px; }

    /* ── Subject breakdown ──────────────────────────────────────────── */
    .subject-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .subject-card {
      background: #FAFAFA; border: 1px solid #E2E8F0;
      border-radius: 10px; padding: 10px 12px;
    }
    .subject-name { font-weight: 700; font-size: 11px; color: #0F172A; margin-bottom: 4px; }
    .subject-meta { font-size: 9px; color: #94A3B8; margin-bottom: 6px; }
    .subject-score { font-size: 18px; font-weight: 900; }

    /* ── Table ──────────────────────────────────────────────────────── */
    .data-table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    .data-table thead tr { background: #0F172A; }
    .data-table th {
      color: rgba(255,255,255,0.7);
      padding: 8px 10px; text-align: left;
      font-size: 9px; text-transform: uppercase;
      letter-spacing: 0.07em; font-weight: 600;
    }
    .data-table th:first-child { border-radius: 8px 0 0 0; }
    .data-table th:last-child  { border-radius: 0 8px 0 0; }
    .data-table td { padding: 7px 10px; border-bottom: 1px solid #F1F5F9; color: #1E293B; }
    .data-table tbody tr:last-child td { border-bottom: none; }
    .data-table tbody tr:hover td { background: #F8FAFC; }
    .data-table-wrap { border-radius: 10px; overflow: hidden; border: 1px solid #E2E8F0; }

    /* ── Badge ──────────────────────────────────────────────────────── */
    .badge {
      display: inline-block; padding: 2px 9px;
      border-radius: 20px; font-size: 9.5px; font-weight: 700;
    }
    .badge-risk-high   { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
    .badge-risk-medium { background: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; }
    .badge-risk-low    { background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; }

    /* ── Attendance status cards ────────────────────────────────────── */
    .att-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
    .att-card { background:#FAFAFA; border:1px solid #E2E8F0; border-radius:10px; padding:12px; text-align:center; }
    .att-val  { font-size:22px; font-weight:900; }
    .att-lbl  { font-size:9px; text-transform:uppercase; letter-spacing:0.07em; color:#94A3B8; margin-top:2px; font-weight:600; }

    /* ── Grade distribution ─────────────────────────────────────────── */
    .grade-dist { display: flex; flex-direction: column; gap: 7px; }
    .grade-dist-row { display: flex; align-items: center; gap: 8px; }
    .grade-dist-label { font-size: 10px; font-weight: 600; color: #475569; width: 110px; flex-shrink: 0; }
    .grade-dist-bar { flex: 1; height: 10px; background: #F1F5F9; border-radius: 5px; overflow: hidden; }
    .grade-dist-fill { height: 100%; border-radius: 5px; transition: width 0.5s; }
    .grade-dist-count { font-size: 10px; font-weight: 700; width: 24px; text-align: right; flex-shrink: 0; }
    .grade-dist-pct { font-size: 9px; color: #94A3B8; width: 30px; text-align: right; flex-shrink: 0; }

    /* ── Two column layout ──────────────────────────────────────────── */
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }

    /* ── Footer ─────────────────────────────────────────────────────── */
    .footer {
      background: #0F172A;
      padding: 12px 28px;
      display: flex; justify-content: space-between; align-items: center;
      font-size: 9.5px; color: rgba(255,255,255,0.3);
    }
    .footer-brand { display:flex; align-items:center; gap:8px; }
    .footer-logo {
      width:18px; height:18px; border-radius:4px;
      background: linear-gradient(135deg,#7C3AED,#A78BFA);
      display:flex; align-items:center; justify-content:center;
      color:#fff; font-weight:900; font-size:9px;
    }

    /* ── Watermark ──────────────────────────────────────────────────── */
    .confidential {
      font-size: 9px; font-weight: 700; letter-spacing: 0.15em;
      color: rgba(255,255,255,0.2); text-transform: uppercase;
    }
  </style>
</head>
<body>

<!-- Action bar -->
<div class="action-bar no-print">
  <div class="action-bar-left">
    <div class="action-bar-logo">G</div>
    <div>
      <div class="action-bar-title">Girls in STEM — Learner Report</div>
      <div class="action-bar-sub">${fullName} &nbsp;·&nbsp; ${(learner as any).learner_code} &nbsp;·&nbsp; Grade ${(learner as any).grade}</div>
    </div>
  </div>
  <button class="btn-print" onclick="window.print()">
    🖨&nbsp; Print / Save PDF
  </button>
</div>

<!-- Report -->
<div class="report">

  <!-- Header -->
  <div class="header">
    <div class="header-brand">
      <div class="header-avatar">${initials || 'G'}</div>
      <div class="header-brand-text">
        <h1>Girls in STEM</h1>
        <p>Learner Progress Report</p>
        <div class="header-code">${(learner as any).learner_code}</div>
      </div>
    </div>
    <div class="header-learner">
      <div class="header-learner-name">${fullName}</div>
      <div class="header-learner-meta">${school?.school_name || '—'}</div>
      <div class="grade-chip">Grade ${(learner as any).grade}</div>
      <div class="header-learner-date">Generated ${today}</div>
    </div>
  </div>

  <!-- Body -->
  <div class="body">

    <!-- KPI Strip -->
    <div class="kpi-grid avoid-break">
      <div class="kpi-card">
        <div class="kpi-value" style="color:${attCol}">${attRate}%</div>
        <div class="kpi-label">Attendance</div>
        <div class="kpi-bar"><div class="kpi-bar-fill" style="width:${attRate}%;background:${attCol}"></div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color:${scoreCol(avgScore)}">${avgScore}%</div>
        <div class="kpi-label">Avg Score</div>
        <div class="kpi-bar"><div class="kpi-bar-fill" style="width:${avgScore}%;background:${scoreCol(avgScore)}"></div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color:#7C3AED">${ass.length}</div>
        <div class="kpi-label">Assessments</div>
        <div class="kpi-bar" style="margin-top:8px">
          <div class="kpi-bar-fill" style="width:${Math.min(ass.length * 10, 100)}%;background:#7C3AED"></div>
        </div>
      </div>
      <div class="kpi-card" style="background:${riskBg};border-color:${riskCol}40">
        <div class="kpi-value" style="color:${riskCol}">${riskLevel.toUpperCase()}</div>
        <div class="kpi-label">Risk Level</div>
        <div style="margin-top:8px">
          <span class="badge badge-risk-${riskLevel}">${riskLevel === 'low' ? '✓ On Track' : riskLevel === 'medium' ? '~ Monitoring' : '⚠ High Risk'}</span>
        </div>
      </div>
    </div>

    <!-- Learner + School Info -->
    <div class="info-grid avoid-break">
      <div class="info-card">
        <div class="info-card-title">Learner Information</div>
        <div class="info-row">
          <span class="info-label">Full Name</span>
          <span class="info-value">${fullName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Learner Code</span>
          <span class="info-value" style="font-family:'Courier New',monospace">${(learner as any).learner_code}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Grade</span>
          <span class="info-value">Grade ${(learner as any).grade}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Status</span>
          <span class="info-value" style="text-transform:capitalize">${(learner as any).programme_status}</span>
        </div>
        ${p?.email    ? `<div class="info-row"><span class="info-label">Email</span><span class="info-value">${p.email}</span></div>` : ''}
        ${p?.phone    ? `<div class="info-row"><span class="info-label">Phone</span><span class="info-value">${p.phone}</span></div>` : ''}
      </div>
      <div class="info-card">
        <div class="info-card-title">School &amp; Parent / Guardian</div>
        <div class="info-row">
          <span class="info-label">School</span>
          <span class="info-value">${school?.school_name || '—'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">District</span>
          <span class="info-value">${school?.district || '—'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Province</span>
          <span class="info-value">${school?.province || '—'}</span>
        </div>
        ${p?.parent_name    ? `<div class="info-row" style="margin-top:6px"><span class="info-label">Parent/Guardian</span><span class="info-value">${p.parent_name}</span></div>` : ''}
        ${p?.parent_contact ? `<div class="info-row"><span class="info-label">Contact</span><span class="info-value">${p.parent_contact}</span></div>` : ''}
      </div>
    </div>

    <!-- Programmes -->
    ${progs.length > 0 ? `
    <div class="section avoid-break">
      <div class="section-title">
        <span class="section-title-dot"></span>
        Enrolled Programmes
        <span class="section-count">${progs.length}</span>
      </div>
      <div class="prog-chips">
        ${progs.map((e: any) => `
          <div class="prog-chip">
            <div class="prog-chip-name">${e.programs?.program_name || '—'}</div>
            <div class="prog-chip-type">${e.programs?.program_type || ''}</div>
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    <!-- Attendance -->
    <div class="section avoid-break">
      <div class="section-title">
        <span class="section-title-dot"></span>
        Attendance Summary
        <span class="section-count">${att.length} sessions</span>
      </div>
      <div class="att-grid">
        ${[
          { status:'present', color:'#10B981', bg:'#ECFDF5' },
          { status:'absent',  color:'#EF4444', bg:'#FEF2F2' },
          { status:'late',    color:'#F59E0B', bg:'#FFFBEB' },
          { status:'excused', color:'#7C3AED', bg:'#F5F3FF' },
        ].map(({ status, color, bg }) => {
          const count = att.filter((a: any) => a.status === status).length;
          return `<div class="att-card" style="background:${bg};border-color:${color}30">
            <div class="att-val" style="color:${color}">${count}</div>
            <div class="att-lbl" style="color:${color}90">${status}</div>
          </div>`;
        }).join('')}
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:5px">
          <span style="color:#64748B;font-weight:600">Overall Attendance Rate</span>
          <span style="font-weight:800;color:${attCol}">${attRate}%</span>
        </div>
        <div style="height:10px;background:#F1F5F9;border-radius:5px;overflow:hidden">
          <div style="height:100%;width:${attRate}%;background:${attCol};border-radius:5px"></div>
        </div>
        ${attRate < 75 ? '<p style="color:#EF4444;font-size:10px;margin-top:6px;font-weight:600">⚠ Below the 75% minimum attendance benchmark</p>' : '<p style="color:#10B981;font-size:10px;margin-top:6px;font-weight:600">✓ Meeting attendance benchmark</p>'}
      </div>
    </div>

    <!-- Academic Performance: subject breakdown + grade dist -->
    ${ass.length > 0 ? `
    <div class="two-col avoid-break">
      <div class="section" style="margin-bottom:0">
        <div class="section-title">
          <span class="section-title-dot"></span>
          Performance by Subject
        </div>
        <div class="subject-grid">
          ${subjects.slice(0, 6).map(s => `
            <div class="subject-card">
              <div class="subject-name">${s.name}</div>
              <div class="subject-meta">${s.count} result${s.count!==1?'s':''}</div>
              <div class="subject-score" style="color:${scoreCol(s.avg)}">${s.avg}%</div>
              <div class="kpi-bar" style="margin-top:4px">
                <div class="kpi-bar-fill" style="width:${s.avg}%;background:${scoreCol(s.avg)}"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="section" style="margin-bottom:0">
        <div class="section-title">
          <span class="section-title-dot"></span>
          Grade Distribution
        </div>
        <div class="grade-dist">
          ${[
            { band:'Distinction',   color:'#7C3AED', range:'80%+' },
            { band:'Merit',         color:'#10B981', range:'70–79%' },
            { band:'Pass',          color:'#F59E0B', range:'50–69%' },
            { band:'Needs Support', color:'#EF4444', range:'Below 50%' },
          ].map(({ band, color, range }) => {
            const count = bands[band] || 0;
            const pct   = ass.length ? Math.round(count / ass.length * 100) : 0;
            return `<div class="grade-dist-row">
              <div class="grade-dist-label" style="color:#475569">${band} <span style="color:#94A3B8;font-weight:400;font-size:9px">${range}</span></div>
              <div class="grade-dist-bar">
                <div class="grade-dist-fill" style="width:${pct}%;background:${color}"></div>
              </div>
              <div class="grade-dist-count" style="color:${color}">${count}</div>
              <div class="grade-dist-pct">${pct}%</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>` : ''}

    <!-- Assessment Results — grouped by grade year → term -->
    <div class="section">
      <div class="section-title">
        <span class="section-title-dot"></span>
        Assessment Results
        <span class="section-count">${ass.length} total</span>
      </div>
      ${(() => {
        if (!ass.length) return `<div style="background:#FAFAFA;border:1px solid #E2E8F0;border-radius:10px;padding:20px;text-align:center;color:#94A3B8;font-size:11px">No assessments recorded yet</div>`;

        // Group by grade year
        const gradeOf = (a: any) => {
          const m = (a.notes ?? '').match(/\(Grade (\d+) \((\d{4})\)\)/);
          return m ? `Grade ${m[1]} (${m[2]})` : 'Other';
        };
        type TD = { mMaths:any; sMaths:any; mScience:any; sScience:any; app:any[]; assign:any[]; baseline:any[] };
        const grouped: Record<string, Record<string, TD>> = {};
        for (const a of ass) {
          const grade = gradeOf(a);
          const term  = String(a.term ?? 'none');
          if (!grouped[grade]) grouped[grade] = {};
          if (!grouped[grade][term]) grouped[grade][term] = { mMaths:null, sMaths:null, mScience:null, sScience:null, app:[], assign:[], baseline:[] };
          const td = grouped[grade][term];
          const notes: string = a.notes ?? '';
          if (a.assessment_type === 'other' && notes.toLowerCase().includes('baseline')) td.baseline.push(a);
          else if (a.assessment_type === 'assignment' || notes.toLowerCase().includes('assignment')) td.assign.push(a);
          else if (a.assessment_type === 'quiz' || notes.toLowerCase().includes('application mark')) td.app.push(a);
          else if (notes.startsWith('Melisizwe Maths'))  td.mMaths   = a;
          else if (notes.startsWith('School Maths'))      td.sMaths   = a;
          else if (notes.startsWith('Melisizwe Science')) td.mScience = a;
          else if (notes.startsWith('School Science'))    td.sScience = a;
        }

        const GRADE_ORDER = ['Grade 9 (2024)', 'Grade 10 (2025)', 'Grade 11 (2026)', 'Other'];
        const grades = GRADE_ORDER.filter(g => grouped[g]);
        const TERM_LABELS: Record<string, string> = { '1':'Term 1','2':'Term 2','3':'Term 3','4':'Term 4','none':'Other' };

        const chip = (a: any, label: string) => {
          const pct  = a ? Number(a.percentage ?? 0) : null;
          const col  = pct === null ? '#94A3B8' : pct >= 80 ? '#7C3AED' : pct >= 70 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';
          const bg   = pct === null ? '#F8FAFC' : pct >= 80 ? '#F5F3FF' : pct >= 70 ? '#ECFDF5' : pct >= 50 ? '#FFFBEB' : '#FEF2F2';
          const bdr  = pct === null ? '#E2E8F0' : col + '60';
          return `<div style="flex:1;background:${bg};border:1px solid ${bdr};border-radius:10px;padding:10px 8px;text-align:center;min-width:80px">
            <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#94A3B8;margin-bottom:4px">${label}</div>
            ${pct !== null
              ? `<div style="font-size:17px;font-weight:900;color:${col};line-height:1">${Math.round(pct)}%</div>
                 <div style="font-size:8px;font-weight:700;color:${col};margin-top:2px;text-transform:uppercase">${a.grade_band ?? ''}</div>
                 <div style="font-size:8px;color:#94A3B8;margin-top:1px">${a.score ?? ''}/${a.max_score ?? 100}</div>`
              : `<div style="font-size:14px;color:#CBD5E1">—</div>`}
          </div>`;
        };

        return grades.map(grade => {
          const terms = grouped[grade];
          const termKeys = Object.keys(terms).sort((a,b) => a==='none'?-1:b==='none'?1:Number(a)-Number(b));
          const allBaselines = termKeys.flatMap(t => terms[t].baseline);
          const allApp       = termKeys.flatMap(t => terms[t].app);
          const allAssign    = termKeys.flatMap(t => terms[t].assign);
          const termDataKeys = termKeys.filter(t => t !== 'none');

          return `
          <div style="margin-bottom:18px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
              <span style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;color:#7C3AED">${grade}</span>
              <div style="flex:1;height:1px;background:#E2E8F0"></div>
            </div>

            ${allBaselines.length ? `
            <div style="margin-bottom:10px">
              <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#94A3B8;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px 8px 0 0;padding:5px 10px">Baseline Assessments</div>
              <div style="display:flex;gap:8px;padding:10px;background:#FAFAFA;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 8px 8px;flex-wrap:wrap">
                ${allBaselines.map((a:any) => chip(a, (a.notes??'').replace(/ \(Grade.*$/,'').replace('Melisizwe ','M. '))).join('')}
              </div>
            </div>` : ''}

            ${allApp.length ? `
            <div style="margin-bottom:10px">
              <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#94A3B8;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px 8px 0 0;padding:5px 10px">Application Marks</div>
              <div style="display:flex;gap:8px;padding:10px;background:#FAFAFA;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 8px 8px;flex-wrap:wrap">
                ${allApp.map((a:any) => chip(a, a.subject)).join('')}
              </div>
            </div>` : ''}

            ${termDataKeys.map(t => {
              const td = terms[t];
              const hasMath = td.mMaths || td.sMaths;
              const hasSci  = td.mScience || td.sScience;
              if (!hasMath && !hasSci) return '';
              return `
              <div style="margin-bottom:10px;break-inside:avoid">
                <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#94A3B8;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px 8px 0 0;padding:5px 10px">${TERM_LABELS[t]}</div>
                <div style="padding:10px;background:#FAFAFA;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 8px 8px">
                  ${hasMath ? `
                  <div style="margin-bottom:8px">
                    <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#CBD5E1;margin-bottom:5px">Mathematics</div>
                    <div style="display:flex;gap:8px">
                      ${chip(td.mMaths, 'Melisizwe')}
                      ${chip(td.sMaths, 'School')}
                    </div>
                  </div>` : ''}
                  ${hasSci ? `
                  <div>
                    <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#CBD5E1;margin-bottom:5px">Science</div>
                    <div style="display:flex;gap:8px">
                      ${chip(td.mScience, 'Melisizwe')}
                      ${chip(td.sScience, 'School')}
                    </div>
                  </div>` : ''}
                </div>
              </div>`;
            }).join('')}

            ${allAssign.length ? `
            <div style="margin-bottom:10px">
              <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#94A3B8;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px 8px 0 0;padding:5px 10px">Assignments</div>
              <div style="display:flex;gap:8px;padding:10px;background:#FAFAFA;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 8px 8px;flex-wrap:wrap">
                ${allAssign.map((a:any) => chip(a, (a.notes??'').replace(/ \(Grade.*$/,'').replace('June ',''))).join('')}
              </div>
            </div>` : ''}
          </div>`;
        }).join('');
      })()}
    </div>

    <!-- Projects -->
    ${projects.length > 0 ? `
    <div class="section avoid-break">
      <div class="section-title">
        <span class="section-title-dot"></span>
        Projects
        <span class="section-count">${projects.length}</span>
      </div>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Project Name</th>
              <th>Programme</th>
              <th>Stage</th>
              <th style="text-align:center">Score</th>
            </tr>
          </thead>
          <tbody>
            ${projects.map((proj: any) => {
              const stage = proj.stage || proj.completion_status || 'not_started';
              const pct   = proj.score != null ? Math.round((proj.score / (proj.max_score || 100)) * 100) : null;
              return `<tr>
                <td style="font-weight:600">${proj.project_name || '—'}</td>
                <td style="color:#64748B;font-size:10px">${(proj.programs as any)?.program_name || '—'}</td>
                <td>
                  <span class="badge" style="background:${stageBg(stage)};color:${stageCol(stage)}">
                    ${stageLabel(stage)}
                  </span>
                </td>
                <td style="text-align:center;font-weight:800;color:${pct !== null ? scoreCol(pct) : '#94A3B8'}">
                  ${pct !== null ? `${pct}%` : '—'}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}

    <!-- Mentorship (if any) -->
    ${mentorship.length > 0 ? `
    <div class="section avoid-break">
      <div class="section-title">
        <span class="section-title-dot"></span>
        Mentorship Sessions
        <span class="section-count">${(learner as any).mentorship_sessions?.length || 0} total</span>
      </div>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead><tr><th>Date</th><th>Notes</th></tr></thead>
          <tbody>
            ${mentorship.map((m: any) => `
              <tr>
                <td style="color:#64748B;white-space:nowrap;font-size:10px">
                  ${m.session_date ? new Date(m.session_date).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                </td>
                <td style="color:#475569">${m.notes || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}

  </div><!-- /body -->

  <!-- Footer -->
  <div class="footer">
    <div class="footer-brand">
      <div class="footer-logo">G</div>
      <span>Girls in STEM Digital Platform &nbsp;·&nbsp; Confidential</span>
    </div>
    <div style="text-align:right">
      <div>Generated ${today}</div>
      <div class="confidential" style="margin-top:2px">Confidential — for authorised use only</div>
    </div>
  </div>

</div><!-- /report -->

</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
