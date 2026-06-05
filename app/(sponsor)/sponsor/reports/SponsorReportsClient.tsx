'use client';
import { DS } from '@/components/platform/tokens';
import { useState } from 'react';

interface Props {
  sponsorName: string;
  assessments: any[];
  attendance:  any[];
  projects:    any[];
  learners:    any[];
}

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
  const a   = document.createElement('a');
  a.href    = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download= filename;
  a.click();
}

const scoreColor = (v: number) => v >= 75 ? '#10B981' : v >= 50 ? '#F59E0B' : '#EF4444';

export default function SponsorReportsClient({ sponsorName, assessments, attendance, projects, learners }: Props) {
  const [tab, setTab] = useState<'summary'|'assessments'|'attendance'|'projects'>('summary');

  const attRate  = attendance.length ? Math.round(attendance.filter(a=>a.status==='present').length/attendance.length*100) : 0;
  const avgScore = assessments.length ? Math.round(assessments.reduce((s,a)=>s+Number(a.percentage||0),0)/assessments.length) : 0;
  const doneProj = projects.filter(p=>['marked','completed'].includes(p.stage||p.completion_status||'')).length;
  const total    = learners.length;

  // Subject breakdown
  const subjectMap: Record<string, number[]> = {};
  assessments.forEach(a => {
    if (!subjectMap[a.subject]) subjectMap[a.subject] = [];
    subjectMap[a.subject].push(Number(a.percentage || 0));
  });
  const subjectBreakdown = Object.entries(subjectMap)
    .map(([subject, scores]) => ({
      subject,
      count: scores.length,
      avg:   Math.round(scores.reduce((s,v)=>s+v,0)/scores.length),
    }))
    .sort((a,b) => b.count - a.count);

  // Export functions
  const exportLearners = () => downloadCSV(
    [['Code','Name','School','Grade','Risk','Attendance %','Avg Score %'],
     ...learners.map(l => [
       l.learner_code,
       `${l.learner_profiles?.first_name||''} ${l.learner_profiles?.last_name||''}`,
       l.schools?.school_name||'',
       l.grade,
       l.risk_scores?.risk_level||'',
       l.risk_scores?.attendance_rate||0,
       l.risk_scores?.avg_score||0,
     ])],
    `${sponsorName}_learners.csv`
  );

  const exportAssessments = () => downloadCSV(
    [['Date','Subject','Score %','Grade Band','Programme'],
     ...assessments.map(a=>[a.assessment_date||'',a.subject||'',a.percentage||'',a.grade_band||'',(a.programs as any)?.program_name||''])],
    `${sponsorName}_assessments.csv`
  );

  const exportAttendance = () => downloadCSV(
    [['Date','Status'],
     ...attendance.map(a=>[a.session_date||'',a.status||''])],
    `${sponsorName}_attendance.csv`
  );

  const tabs = [
    { key: 'summary'     as const, label: 'Impact Summary' },
    { key: 'assessments' as const, label: 'Assessments' },
    { key: 'attendance'  as const, label: 'Attendance' },
    { key: 'projects'    as const, label: 'Projects' },
  ];

  return (
    <div className="space-y-8" style={{ color: DS.text }}>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#1D4ED8' }}>
            Reports & Insights
          </p>
          <h1 className="text-3xl font-black tracking-tight">Impact Report</h1>
          <p className="text-sm mt-1" style={{ color: DS.textMuted }}>
            {sponsorName} &nbsp;·&nbsp; Generated {new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportLearners}
            className="text-sm font-semibold px-4 py-2 rounded-xl"
            style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
            ↓ Learner Export
          </button>
          <button onClick={exportAssessments}
            className="text-sm font-semibold px-4 py-2 rounded-xl"
            style={{ background: DS.successLight, color: DS.success, border: '1px solid #A7F3D0' }}>
            ↓ Assessment Data
          </button>
          <button onClick={exportAttendance}
            className="text-sm font-semibold px-4 py-2 rounded-xl"
            style={{ background: DS.warnLight, color: DS.warn, border: '1px solid #FDE68A' }}>
            ↓ Attendance Data
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: DS.borderLight }}>
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: tab === key ? '#FFF' : 'transparent',
              color:      tab === key ? '#0F172A' : '#64748B',
              boxShadow:  tab === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* SUMMARY TAB */}
      {tab === 'summary' && (
        <div className="space-y-6">

          {/* Headline metrics — "ROI" framing */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Learners Supported',    value: total,       unit: 'girls',   color: '#1D4ED8', desc: 'Active participants in the programme' },
              { label: 'Attendance Rate',        value: `${attRate}%`, unit: '',     color: attRate>=75?'#10B981':'#EF4444', desc: attRate>=75?'Meeting 75% benchmark':'Below 75% benchmark' },
              { label: 'Academic Performance',   value: `${avgScore}%`, unit: 'avg',color: scoreColor(avgScore), desc: `${assessments.length} assessments recorded` },
              { label: 'Projects Completed',     value: doneProj,   unit: 'done',   color: '#7C3AED', desc: `${projects.length} projects total` },
            ].map(({ label, value, unit, color, desc }) => (
              <div key={label} className="rounded-2xl p-5" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: DS.textMuted }}>{label}</p>
                <p className="text-4xl font-black tabular-nums leading-none" style={{ color }}>
                  {value}
                </p>
                {unit && <p className="text-sm mt-0.5 font-medium" style={{ color: DS.textMuted }}>{unit}</p>}
                <p className="text-xs mt-2" style={{ color: DS.borderLight }}>{desc}</p>
              </div>
            ))}
          </div>

          {/* Subject performance breakdown */}
          {subjectBreakdown.length > 0 && (
            <div className="rounded-2xl p-6" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
              <h2 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: DS.textMuted }}>
                Performance by Subject
              </h2>
              <div className="space-y-4">
                {subjectBreakdown.map(({ subject, count, avg }) => (
                  <div key={subject}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold" style={{ color: DS.text }}>{subject}</span>
                        <span className="text-xs px-2 py-0.5 rounded" style={{ background: DS.surfaceHover, color: DS.textMuted, border: `1px solid ${DS.border}` }}>
                          {count} result{count!==1?'s':''}
                        </span>
                      </div>
                      <span className="text-sm font-bold tabular-nums" style={{ color: scoreColor(avg) }}>{avg}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: DS.borderLight }}>
                      <div className="h-full rounded-full" style={{ width: `${avg}%`, background: scoreColor(avg) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk summary */}
          <div className="rounded-2xl p-6" style={{ background: '#0F172A' }}>
            <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Learner Wellbeing Overview
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'On Track',     count: learners.filter(l=>l.risk_scores?.risk_level==='low').length,    color: DS.success, desc: 'Meeting all benchmarks' },
                { label: 'Monitoring',   count: learners.filter(l=>l.risk_scores?.risk_level==='medium').length, color: DS.warn, desc: 'Needs some attention' },
                { label: 'High Risk',    count: learners.filter(l=>l.risk_scores?.risk_level==='high').length,   color: DS.danger, desc: 'Requires intervention' },
              ].map(({ label, count, color, desc }) => (
                <div key={label}>
                  <p className="text-3xl font-black tabular-nums" style={{ color }}>{count}</p>
                  <p className="text-sm font-semibold mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ASSESSMENTS TAB */}
      {tab === 'assessments' && (
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${DS.border}` }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ background: DS.surfaceHover, borderBottom: `1px solid ${DS.border}` }}>
            <div>
              <p className="font-semibold" style={{ color: DS.text }}>{assessments.length} Assessment Records</p>
              <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>Average: {avgScore}% across all subjects</p>
            </div>
            <button onClick={exportAssessments}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
              ↓ CSV
            </button>
          </div>
          <table className="w-full" style={{ background: DS.surface }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${DS.borderLight}` }}>
                {['Date','Subject','Score','Grade','Programme'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider"
                    style={{ color: DS.textMuted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assessments.slice(0,50).map((a, i) => {
                const pct = Number(a.percentage || 0);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #F8FAFC' }}>
                    <td className="px-5 py-3 text-xs" style={{ color: DS.textMuted }}>{a.assessment_date ? new Date(a.assessment_date).toLocaleDateString('en-ZA') : '—'}</td>
                    <td className="px-5 py-3 text-sm font-semibold" style={{ color: DS.text }}>{a.subject || '—'}</td>
                    <td className="px-5 py-3 text-sm font-bold tabular-nums" style={{ color: scoreColor(pct) }}>{pct}%</td>
                    <td className="px-5 py-3">
                      {a.grade_band && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{
                            background: { Distinction:'#EFF6FF', Merit:'#ECFDF5', Pass:'#FFFBEB', 'Needs Support':'#FEF2F2' }[a.grade_band as string] || '#F8FAFC',
                            color:      { Distinction:'#1D4ED8', Merit:'#059669', Pass:'#D97706', 'Needs Support':'#DC2626' }[a.grade_band as string] || '#64748B',
                          }}>
                          {a.grade_band}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: DS.textMuted }}>{(a.programs as any)?.program_name || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {assessments.length > 50 && (
            <div className="px-5 py-3 text-center text-xs" style={{ borderTop: `1px solid ${DS.borderLight}`, color: DS.textMuted, background: DS.surfaceHover }}>
              Showing 50 of {assessments.length} — download CSV for full data
            </div>
          )}
        </div>
      )}

      {/* ATTENDANCE TAB */}
      {tab === 'attendance' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {['present','absent','late','excused'].map(status => {
              const count = attendance.filter(a=>a.status===status).length;
              const pct   = attendance.length ? Math.round(count/attendance.length*100) : 0;
              const conf  = { present:{color:'#10B981',bg:'#ECFDF5'}, absent:{color:'#EF4444',bg:'#FEF2F2'}, late:{color:'#F59E0B',bg:'#FFFBEB'}, excused:{color:'#1D4ED8',bg:'#EFF6FF'} }[status]!;
              return (
                <div key={status} className="rounded-2xl p-5" style={{ background: conf.bg, border: `1px solid ${conf.color}30` }}>
                  <p className="text-3xl font-black tabular-nums" style={{ color: conf.color }}>{count}</p>
                  <p className="text-sm font-semibold mt-1 capitalize" style={{ color: conf.color }}>{status}</p>
                  <p className="text-xs mt-0.5" style={{ color: conf.color + '80' }}>{pct}% of sessions</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl p-5" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold" style={{ color: DS.text }}>Overall Attendance Rate</p>
              <p className="text-2xl font-black tabular-nums" style={{ color: attRate>=75?'#10B981':'#EF4444' }}>{attRate}%</p>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: DS.borderLight }}>
              <div className="h-full rounded-full" style={{ width: `${attRate}%`, background: attRate>=75?'#10B981':'#EF4444' }} />
            </div>
            <p className="text-xs mt-2" style={{ color: DS.textMuted }}>
              {attRate >= 75 ? '✓ Meeting 75% benchmark' : '⚠ Below 75% minimum attendance benchmark'}
            </p>
          </div>
        </div>
      )}

      {/* PROJECTS TAB */}
      {tab === 'projects' && (
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${DS.border}` }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ background: DS.surfaceHover, borderBottom: `1px solid ${DS.border}` }}>
            <div>
              <p className="font-semibold" style={{ color: DS.text }}>{projects.length} Projects</p>
              <p className="text-xs mt-0.5" style={{ color: DS.textMuted }}>{doneProj} completed</p>
            </div>
            <div className="flex gap-3">
              {[
                { label: `${projects.filter(p=>['marked','completed'].includes(p.stage||p.completion_status||'')).length} Completed`, color:'#10B981', bg:'#ECFDF5' },
                { label: `${projects.filter(p=>['submitted','review'].includes(p.stage||'')).length} In Review`, color:'#7C3AED', bg:'#F5F3FF' },
                { label: `${projects.filter(p=>['planning','in_progress'].includes(p.stage||p.completion_status||'')).length} Active`, color:'#F59E0B', bg:'#FFFBEB' },
              ].map(({ label, color, bg }) => (
                <span key={label} className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: bg, color }}>{label}</span>
              ))}
            </div>
          </div>
          <table className="w-full" style={{ background: DS.surface }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${DS.borderLight}` }}>
                {['Project','Stage','Score','Programme'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider"
                    style={{ color: DS.textMuted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => {
                const pct  = p.score != null ? Math.round((p.score / (p.max_score||100)) * 100) : null;
                const stageCfg: Record<string, { label:string; color:string; bg:string }> = {
                  planning:    { label:'Planning',     color:'#64748B', bg:'#F8FAFC' },
                  in_progress: { label:'In Progress',  color:'#D97706', bg:'#FFFBEB' },
                  review:      { label:'In Review',    color:'#7C3AED', bg:'#F5F3FF' },
                  submitted:   { label:'Submitted',    color:'#1D4ED8', bg:'#EFF6FF' },
                  marked:      { label:'Marked',       color:'#059669', bg:'#ECFDF5' },
                  not_started: { label:'Not Started',  color:'#94A3B8', bg:'#F8FAFC' },
                  completed:   { label:'Completed',    color:'#059669', bg:'#ECFDF5' },
                };
                const sc = stageCfg[p.stage || p.completion_status || 'not_started'] || stageCfg.not_started;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #F8FAFC' }}>
                    <td className="px-5 py-3 text-sm font-semibold" style={{ color: DS.text }}>{p.project_name || '—'}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                    </td>
                    <td className="px-5 py-3 text-sm font-bold tabular-nums"
                      style={{ color: pct !== null ? scoreColor(pct) : '#94A3B8' }}>
                      {pct !== null ? `${pct}%` : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: DS.textMuted }}>{(p.programs as any)?.program_name || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
