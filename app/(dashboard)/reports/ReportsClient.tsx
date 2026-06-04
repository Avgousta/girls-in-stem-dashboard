'use client';
import { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import {
  Download, School, Users, BarChart3, FolderKanban, Award,
  TrendingUp, LayoutDashboard,
} from 'lucide-react';
import { DS } from '@/components/platform/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SchoolRow    { name: string; count: number; att: number; score: number }
interface GradeRow     { grade: number; count: number; att: number; score: number }
interface ProgrammeRow { name: string; type: string; learners: number; att: number; avgScore: number; assCount: number }
interface SponsorRow   { name: string; count: number }
interface BandRow      { band: string; count: number }

interface Props {
  schoolBreakdown:    SchoolRow[];
  gradeBreakdown:     GradeRow[];
  programmeBreakdown: ProgrammeRow[];
  sponsorBreakdown:   SponsorRow[];
  scoreDist:          BandRow[];
  rawLearners:        any[];
  rawAttendance:      any[];
  rawAssessments:     any[];
  rawProjects:        any[];
  rawInterventions:   any[];
}

type Tab = 'overview' | 'schools' | 'grades' | 'programmes' | 'sponsors' | 'export';

// ─── Config ───────────────────────────────────────────────────────────────────
const BAND_COLOR: Record<string, string> = {
  Distinction:    '#34D399',
  Merit:          '#818CF8',
  Pass:           '#FBBF24',
  'Needs Support':'#F87171',
};

function metricColor(val: number, threshold = 75) {
  return val >= threshold ? 'var(--ds-success)' : val >= 60 ? 'var(--ds-warn)' : 'var(--ds-danger)';
}

// ─── Chart tooltip ─────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-xl"
      style={{ background: DS.bg, border: `1px solid ${DS.border}` }}>
      <p className="font-bold mb-1" style={{ color: DS.textMid }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? p.fill }}>
          {p.name}: <strong>{p.value}{p.name?.includes('%') || p.name?.includes('Rate') || p.name?.includes('Score') ? '%' : ''}</strong>
        </p>
      ))}
    </div>
  );
}

// ─── Progress bar ──────────────────────────────────────────────────────────
function Bar2({ value, threshold = 75 }: { value: number; threshold?: number }) {
  const color = metricColor(value, threshold);
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: DS.borderLight }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums w-9 text-right" style={{ color }}>{value}%</span>
    </div>
  );
}

// ─── CSV download ──────────────────────────────────────────────────────────
function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a   = document.createElement('a');
  a.href    = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  a.click();
}

// ─── Section card ──────────────────────────────────────────────────────────
function SectionCard({ title, action, children }: {
  title: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
      <div className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${DS.border}` }}>
        <h2 className="text-sm font-semibold" style={{ color: DS.text }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Data table ────────────────────────────────────────────────────────────
function DTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: `1px solid ${DS.border}` }}>
            {headers.map(h => (
              <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider"
                style={{ color: DS.textMuted }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function DRow({ cells, highlight }: { cells: React.ReactNode[]; highlight?: boolean }) {
  return (
    <tr style={{ borderBottom: `1px solid ${DS.borderLight}`, background: highlight ? DS.surfaceHover as string : 'transparent' }}>
      {cells.map((c, i) => (
        <td key={i} className="px-5 py-3">{c}</td>
      ))}
    </tr>
  );
}

// ─── Attendance trend (8-week) ─────────────────────────────────────────────
function AttendanceTrend({ rawAttendance }: { rawAttendance: any[] }) {
  const data = useMemo(() => Array.from({ length: 8 }, (_, i) => {
    const weekOffset = 7 - i;
    const end   = new Date(); end.setDate(end.getDate() - weekOffset * 7);
    const start = new Date(end); start.setDate(start.getDate() - 6);
    const label = `${start.getMonth() + 1}/${start.getDate()}`;
    const week  = rawAttendance.filter(a => {
      const d = new Date(a.session_date); return d >= start && d <= end;
    });
    const rate  = week.length
      ? Math.round(week.filter(a => a.status === 'present').length / week.length * 100)
      : null;
    return { label, 'Att Rate': rate };
  }), [rawAttendance]);

  return (
    <SectionCard title="8-Week Attendance Trend">
      <div className="p-5">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={DS.borderLight as string} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: DS.textMuted as string }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: DS.textMuted as string }} axisLine={false} tickLine={false} width={28} tickFormatter={v => `${v}%`} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="Att Rate" stroke="#34D399" strokeWidth={2.5}
              dot={{ fill: '#34D399', r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

// ─── Score distribution ────────────────────────────────────────────────────
function ScoreDistribution({ scoreDist }: { scoreDist: BandRow[] }) {
  const total = scoreDist.reduce((s, b) => s + b.count, 0);
  return (
    <SectionCard title="Score Distribution by Grade Band">
      <div className="p-5 space-y-3">
        {total === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: DS.textMuted }}>No assessment data yet</p>
        ) : scoreDist.map(({ band, count }) => {
          const pct   = total ? Math.round(count / total * 100) : 0;
          const color = BAND_COLOR[band] ?? '#94A3B8';
          return (
            <div key={band}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold" style={{ color: DS.textMid }}>{band}</span>
                <span className="text-xs font-black tabular-nums" style={{ color }}>
                  {count} <span style={{ color: DS.textMuted }}>({pct}%)</span>
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: DS.borderLight }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ─── Cohort health summary ─────────────────────────────────────────────────
function CohortHealth({ rawLearners, rawInterventions }: { rawLearners: any[]; rawInterventions: any[] }) {
  const active   = rawLearners.filter(l => l.programme_status === 'active').length;
  const highRisk = rawLearners.filter(l => l.risk_scores?.risk_level === 'high').length;
  const medRisk  = rawLearners.filter(l => l.risk_scores?.risk_level === 'medium').length;
  const openInt  = rawInterventions.filter(i => i.status === 'open').length;
  const total    = rawLearners.length;

  const items = [
    { label: 'Active learners',     value: active,   pct: total ? Math.round(active / total * 100) : 0,   color: 'var(--ds-success)' },
    { label: 'High risk',           value: highRisk, pct: total ? Math.round(highRisk / total * 100) : 0, color: 'var(--ds-danger)'  },
    { label: 'Medium risk',         value: medRisk,  pct: total ? Math.round(medRisk / total * 100) : 0,  color: 'var(--ds-warn)'    },
    { label: 'Open interventions',  value: openInt,  pct: null,                                            color: '#818CF8'           },
  ];

  return (
    <SectionCard title="Cohort Health">
      <div className="grid grid-cols-2 gap-3 p-5">
        {items.map(({ label, value, pct, color }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: DS.surfaceHover }}>
            <p className="text-2xl font-black tabular-nums" style={{ color }}>{value}</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: DS.textMid }}>{label}</p>
            {pct !== null && (
              <p className="text-[10px] mt-0.5" style={{ color: DS.textMuted }}>{pct}% of cohort</p>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ─── School chart ──────────────────────────────────────────────────────────
function SchoolChart({ data }: { data: SchoolRow[] }) {
  if (data.length === 0) return null;
  const chartData = data.slice(0, 10).map(s => ({
    name:  s.name.length > 20 ? s.name.slice(0, 18) + '…' : s.name,
    'Att %':   s.att,
    'Score %': s.score,
  }));
  return (
    <div className="px-5 pb-5">
      <ResponsiveContainer width="100%" height={Math.max(chartData.length * 44, 120)}>
        <BarChart data={chartData} layout="vertical" barSize={8} barGap={3}
          margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={DS.borderLight as string} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`}
            tick={{ fontSize: 10, fill: DS.textMuted as string }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={150}
            tick={{ fontSize: 11, fill: DS.text as string }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(124,58,237,0.06)' }} />
          <Bar dataKey="Att %"   fill="#34D399" radius={[0,3,3,0]} />
          <Bar dataKey="Score %" fill="#818CF8" radius={[0,3,3,0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-1 justify-end">
        {[{ color:'#34D399', label:'Attendance' }, { color:'#818CF8', label:'Score' }].map(l => (
          <span key={l.label} className="flex items-center gap-1 text-xs" style={{ color: DS.textMuted }}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />{l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Grade chart ───────────────────────────────────────────────────────────
function GradeChart({ data }: { data: GradeRow[] }) {
  if (data.length === 0) return null;
  const chartData = data.map(g => ({
    name: `Gr ${g.grade}`,
    'Att %':   g.att,
    'Score %': g.score,
  }));
  return (
    <div className="px-5 pb-5">
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData} barSize={14} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke={DS.borderLight as string} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: DS.text as string }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`}
            tick={{ fontSize: 10, fill: DS.textMuted as string }} axisLine={false} tickLine={false} width={28} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(124,58,237,0.06)' }} />
          <Bar dataKey="Att %"   fill="#34D399" radius={[3,3,0,0]} />
          <Bar dataKey="Score %" fill="#818CF8" radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-1 justify-end">
        {[{ color:'#34D399', label:'Attendance' }, { color:'#818CF8', label:'Score' }].map(l => (
          <span key={l.label} className="flex items-center gap-1 text-xs" style={{ color: DS.textMuted }}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />{l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Export button ──────────────────────────────────────────────────────────
function ExportBtn({ label, onClick, count }: { label: string; onClick: () => void; count: number }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl"
      style={{ background: DS.surfaceHover, border: `1px solid ${DS.border}` }}>
      <div>
        <p className="text-sm font-semibold" style={{ color: DS.text }}>{label}</p>
        <p className="text-xs" style={{ color: DS.textMuted }}>{count} rows</p>
      </div>
      <button onClick={onClick}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer transition-all"
        style={{ background: DS.primaryLight, color: DS.primary, border: `1px solid ${DS.primaryBorder}` }}>
        <Download className="w-3.5 h-3.5" /> CSV
      </button>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────
export default function ReportsClient({
  schoolBreakdown, gradeBreakdown, programmeBreakdown, sponsorBreakdown,
  scoreDist, rawLearners, rawAttendance, rawAssessments, rawProjects, rawInterventions,
}: Props) {
  const [tab, setTab] = useState<Tab>('overview');

  const tabs: Array<{ key: Tab; label: string; icon: any }> = [
    { key: 'overview',    label: 'Overview',    icon: LayoutDashboard },
    { key: 'schools',     label: 'Schools',     icon: School          },
    { key: 'grades',      label: 'Grades',      icon: Users           },
    { key: 'programmes',  label: 'Programmes',  icon: BarChart3       },
    { key: 'sponsors',    label: 'Sponsors',    icon: Award           },
    { key: 'export',      label: 'Export',      icon: Download        },
  ];

  // ── Export helpers ──────────────────────────────────────────────────────
  const exportSchools = () => downloadCSV(
    [['School','Learners','Avg Attendance %','Avg Score %'],
     ...schoolBreakdown.map(s => [s.name, String(s.count), String(s.att), String(s.score)])],
    'report_schools.csv');

  const exportGrades = () => downloadCSV(
    [['Grade','Learners','Avg Attendance %','Avg Score %'],
     ...gradeBreakdown.map(g => [`Grade ${g.grade}`, String(g.count), String(g.att), String(g.score)])],
    'report_grades.csv');

  const exportProgrammes = () => downloadCSV(
    [['Programme','Type','Avg Score %','Assessments'],
     ...programmeBreakdown.map(p => [p.name, p.type, String(p.avgScore), String(p.assCount)])],
    'report_programmes.csv');

  const exportLearners = () => downloadCSV(
    [['Code','First Name','Last Name','School','Grade','Status','Att %','Avg Score %','Risk'],
     ...rawLearners.map((l: any) => [
       l.learner_code || '', l.learner_profiles?.first_name || '', l.learner_profiles?.last_name || '',
       l.schools?.school_name || '', String(l.grade ?? ''), l.programme_status,
       String(Math.round(l.risk_scores?.attendance_rate || 0)),
       String(Math.round(l.risk_scores?.avg_score || 0)),
       l.risk_scores?.risk_level || 'low',
     ])],
    'report_learners.csv');

  const exportAssessments = () => downloadCSV(
    [['Date','Subject','Score %','Grade Band','Programme'],
     ...rawAssessments.map((a: any) => [
       a.assessment_date || '', a.subject || '',
       String(a.percentage || 0), a.grade_band || '',
       (a.programs as any)?.program_name || '',
     ])],
    'report_assessments.csv');

  const exportProjects = () => downloadCSV(
    [['Project','Stage','Status','Score','Max Score','Due Date','Programme'],
     ...rawProjects.map((p: any) => [
       p.project_name || '', p.stage || '', p.completion_status || '',
       String(p.score ?? ''), String(p.max_score ?? ''), p.due_date || '',
       (p.programs as any)?.program_name || '',
     ])],
    'report_projects.csv');

  const exportInterventions = () => downloadCSV(
    [['Learner ID','Status','Created'],
     ...rawInterventions.map((i: any) => [
       i.learner_id, i.status, i.created_at?.slice(0, 10) || '',
     ])],
    'report_interventions.csv');

  return (
    <div className="space-y-5 pb-20">

      {/* Tab bar */}
      <div className="rounded-2xl p-1 flex flex-wrap gap-1"
        style={{ background: DS.surfaceHover }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer"
            style={tab === key
              ? { background: DS.primary, color: '#fff' }
              : { background: 'transparent', color: DS.textMid as string }}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <AttendanceTrend rawAttendance={rawAttendance} />
            <ScoreDistribution scoreDist={scoreDist} />
          </div>
          <CohortHealth rawLearners={rawLearners} rawInterventions={rawInterventions} />
        </div>
      )}

      {/* ── SCHOOLS ── */}
      {tab === 'schools' && (
        <div className="space-y-4">
          <SectionCard title="Performance by School"
            action={
              <button onClick={exportSchools}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer"
                style={{ background: DS.primaryLight, color: DS.primary, border: `1px solid ${DS.primaryBorder}` }}>
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            }>
            <SchoolChart data={schoolBreakdown} />
          </SectionCard>
          <SectionCard title="School Data Table">
            <DTable headers={['School', 'Learners', 'Avg Attendance', 'Avg Score']}>
              {schoolBreakdown.map((s, i) => (
                <DRow key={i} cells={[
                  <span className="font-semibold" style={{ color: DS.text }}>{s.name}</span>,
                  <span className="font-bold tabular-nums" style={{ color: DS.primary }}>{s.count}</span>,
                  <Bar2 value={s.att} />,
                  <Bar2 value={s.score} threshold={60} />,
                ]} />
              ))}
            </DTable>
          </SectionCard>
        </div>
      )}

      {/* ── GRADES ── */}
      {tab === 'grades' && (
        <div className="space-y-4">
          <SectionCard title="Performance by Grade"
            action={
              <button onClick={exportGrades}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer"
                style={{ background: DS.primaryLight, color: DS.primary, border: `1px solid ${DS.primaryBorder}` }}>
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            }>
            <GradeChart data={gradeBreakdown} />
          </SectionCard>
          <SectionCard title="Grade Data Table">
            <DTable headers={['Grade', 'Learners', 'Avg Attendance', 'Avg Score']}>
              {gradeBreakdown.map((g, i) => (
                <DRow key={i} cells={[
                  <span className="font-bold" style={{ color: DS.text }}>Grade {g.grade}</span>,
                  <span className="font-bold tabular-nums" style={{ color: DS.primary }}>{g.count}</span>,
                  <Bar2 value={g.att} />,
                  <Bar2 value={g.score} threshold={60} />,
                ]} />
              ))}
            </DTable>
          </SectionCard>
        </div>
      )}

      {/* ── PROGRAMMES ── */}
      {tab === 'programmes' && (
        <SectionCard title="Programme Breakdown"
          action={
            <button onClick={exportProgrammes}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer"
              style={{ background: DS.primaryLight, color: DS.primary, border: `1px solid ${DS.primaryBorder}` }}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          }>
          <DTable headers={['Programme', 'Type', 'Assessments', 'Avg Score']}>
            {programmeBreakdown.map((p, i) => (
              <DRow key={i} cells={[
                <span className="font-semibold" style={{ color: DS.text }}>{p.name}</span>,
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: DS.primaryLight, color: DS.primary }}>{p.type}</span>,
                <span className="font-mono" style={{ color: DS.textMid }}>{p.assCount}</span>,
                p.assCount > 0
                  ? <Bar2 value={p.avgScore} threshold={60} />
                  : <span className="text-xs" style={{ color: DS.textMuted }}>No data</span>,
              ]} />
            ))}
          </DTable>
        </SectionCard>
      )}

      {/* ── SPONSORS ── */}
      {tab === 'sponsors' && (
        <SectionCard title="Breakdown by Sponsor">
          {sponsorBreakdown.length === 0 ? (
            <div className="text-center py-12 text-sm" style={{ color: DS.textMuted }}>
              No sponsor links found
            </div>
          ) : (
            <DTable headers={['Sponsor', 'Learners Sponsored', 'Share']}>
              {sponsorBreakdown.map((s: any, i: number) => {
                const total = sponsorBreakdown.reduce((sum: number, x: any) => sum + x.count, 0);
                const pct   = total ? Math.round(s.count / total * 100) : 0;
                return (
                  <DRow key={i} cells={[
                    <span className="font-semibold" style={{ color: DS.text }}>{s.name}</span>,
                    <span className="font-bold tabular-nums" style={{ color: DS.primary }}>{s.count}</span>,
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: DS.borderLight }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: DS.primary }} />
                      </div>
                      <span className="text-xs tabular-nums w-8 text-right" style={{ color: DS.textMuted }}>{pct}%</span>
                    </div>,
                  ]} />
                );
              })}
            </DTable>
          )}
        </SectionCard>
      )}

      {/* ── EXPORT ── */}
      {tab === 'export' && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: DS.textMuted }}>
            Download any dataset as a CSV file for use in Excel, Google Sheets, or your reporting tools.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ExportBtn label="Learners"      onClick={exportLearners}      count={rawLearners.length}      />
            <ExportBtn label="Assessments"   onClick={exportAssessments}   count={rawAssessments.length}   />
            <ExportBtn label="Projects"      onClick={exportProjects}      count={rawProjects.length}      />
            <ExportBtn label="Interventions" onClick={exportInterventions} count={rawInterventions.length} />
            <ExportBtn label="Schools"       onClick={exportSchools}       count={schoolBreakdown.length}  />
            <ExportBtn label="Grades"        onClick={exportGrades}        count={gradeBreakdown.length}   />
            <ExportBtn label="Programmes"    onClick={exportProgrammes}    count={programmeBreakdown.length} />
          </div>
        </div>
      )}
    </div>
  );
}
