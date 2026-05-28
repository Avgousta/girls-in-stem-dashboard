'use client';
import { useState } from 'react';
import { Download, School, Users, BarChart3, FolderKanban, Award } from 'lucide-react';
import { cn } from '@/utils';

interface SchoolRow     { name: string; count: number; att: number; score: number }
interface GradeRow      { grade: number; count: number; att: number; score: number }
interface ProgrammeRow  { name: string; type: string; learners: number; att: number; avgScore: number; assCount: number }
interface SponsorRow    { name: string; count: number }

interface Props {
  schoolBreakdown:    SchoolRow[];
  gradeBreakdown:     GradeRow[];
  programmeBreakdown: ProgrammeRow[];
  sponsorBreakdown:   SponsorRow[];
  rawLearners:        any[];
  rawAttendance:      any[];
  rawAssessments:     any[];
  rawProjects:        any[];
}

type Tab = 'schools' | 'grades' | 'programmes' | 'sponsors' | 'learners' | 'assessments';

const barColor = (val: number, threshold = 75) =>
  val >= threshold ? '#2DD4A0' : val >= 60 ? '#FCD34D' : '#F87171';

function ProgressBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono font-semibold w-10 text-right" style={{ color }}>{value}%</span>
    </div>
  );
}

export default function ReportsClient({
  schoolBreakdown, gradeBreakdown, programmeBreakdown, sponsorBreakdown,
  rawLearners, rawAttendance, rawAssessments, rawProjects,
}: Props) {
  const [tab, setTab] = useState<Tab>('schools');

  const tabs: Array<{ key: Tab; label: string; icon: any }> = [
    { key: 'schools',     label: 'Schools',      icon: School },
    { key: 'grades',      label: 'Grades',        icon: Users },
    { key: 'programmes',  label: 'Programmes',    icon: BarChart3 },
    { key: 'sponsors',    label: 'Sponsors',      icon: Award },
    { key: 'learners',    label: 'Learner Export',icon: Users },
    { key: 'assessments', label: 'Score Export',  icon: BarChart3 },
  ];

  const downloadCSV = (rows: string[][], filename: string) => {
    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = filename;
    a.click();
  };

  const exportSchools = () => downloadCSV(
    [['School','Learners','Avg Attendance %','Avg Score %'],
     ...schoolBreakdown.map(s => [s.name, String(s.count), String(s.att), String(s.score)])],
    'report_schools.csv'
  );

  const exportGrades = () => downloadCSV(
    [['Grade','Learners','Avg Attendance %','Avg Score %'],
     ...gradeBreakdown.map(g => [`Grade ${g.grade}`, String(g.count), String(g.att), String(g.score)])],
    'report_grades.csv'
  );

  const exportProgrammes = () => downloadCSV(
    [['Programme','Type','Avg Score %','Assessments'],
     ...programmeBreakdown.map(p => [p.name, p.type, String(p.avgScore), String(p.assCount)])],
    'report_programmes.csv'
  );

  const exportLearners = () => downloadCSV(
    [['Code','First Name','Last Name','School','Grade','Status','Att %','Avg Score %','Risk'],
     ...rawLearners.map((l: any) => [
       l.learner_code || '', l.learner_profiles?.first_name || '', l.learner_profiles?.last_name || '',
       l.schools?.school_name || '', String(l.grade), l.programme_status,
       String(l.risk_scores?.attendance_rate || 0), String(l.risk_scores?.avg_score || 0),
       l.risk_scores?.risk_level || 'low',
     ])],
    'report_learners.csv'
  );

  const exportAssessments = () => downloadCSV(
    [['Date','Learner','Subject','Score %','Grade Band','Programme'],
     ...rawAssessments.map((a: any) => [
       a.assessment_date || '', '', a.subject || '',
       String(a.percentage || 0), a.grade_band || '', (a.programs as any)?.program_name || '',
     ])],
    'report_assessments.csv'
  );

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === key ? 'bg-white shadow-sm text-brand-700' : 'text-gray-500 hover:text-gray-700')}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Schools */}
      {tab === 'schools' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Breakdown by School</h2>
            <button onClick={exportSchools} className="btn-secondary text-xs">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
          <table className="w-full data-table">
            <thead>
              <tr key="hdr">
                <th key="school">School</th>
                <th key="learners">Learners</th>
                <th key="att">Attendance Rate</th>
                <th key="score">Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {schoolBreakdown.map((s, i) => (
                <tr key={i}>
                  <td key="name" className="font-semibold text-gray-800">{s.name}</td>
                  <td key="count">
                    <span className="font-mono font-bold text-brand-700">{s.count}</span>
                  </td>
                  <td key="att" className="w-48">
                    <ProgressBar value={s.att} color={barColor(s.att)} />
                  </td>
                  <td key="score" className="w-48">
                    <ProgressBar value={s.score} color={barColor(s.score, 60)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grades */}
      {tab === 'grades' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Breakdown by Grade</h2>
            <button onClick={exportGrades} className="btn-secondary text-xs">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
          <table className="w-full data-table">
            <thead>
              <tr key="hdr">
                <th key="grade">Grade</th>
                <th key="count">Learners</th>
                <th key="att">Attendance Rate</th>
                <th key="score">Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {gradeBreakdown.map((g, i) => (
                <tr key={i}>
                  <td key="grade">
                    <span className="font-bold text-gray-800">Grade {g.grade}</span>
                  </td>
                  <td key="count">
                    <span className="font-mono font-bold text-brand-700">{g.count}</span>
                  </td>
                  <td key="att" className="w-48">
                    <ProgressBar value={g.att} color={barColor(g.att)} />
                  </td>
                  <td key="score" className="w-48">
                    <ProgressBar value={g.score} color={barColor(g.score, 60)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Programmes */}
      {tab === 'programmes' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Breakdown by Programme</h2>
            <button onClick={exportProgrammes} className="btn-secondary text-xs">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
          <table className="w-full data-table">
            <thead>
              <tr key="hdr">
                <th key="name">Programme</th>
                <th key="type">Type</th>
                <th key="ass">Assessments</th>
                <th key="score">Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {programmeBreakdown.map((p, i) => (
                <tr key={i}>
                  <td key="name" className="font-semibold text-gray-800">{p.name}</td>
                  <td key="type" className="text-xs text-gray-500">{p.type}</td>
                  <td key="ass" className="font-mono">{p.assCount}</td>
                  <td key="score" className="w-48">
                    {p.assCount > 0
                      ? <ProgressBar value={p.avgScore} color={barColor(p.avgScore, 60)} />
                      : <span className="text-gray-300 text-xs">No data</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sponsors */}
      {tab === 'sponsors' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Breakdown by Sponsor</h2>
          </div>
          {sponsorBreakdown.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No sponsor links found.</div>
          ) : (
            <table className="w-full data-table">
              <thead>
                <tr key="hdr">
                  <th key="sponsor">Sponsor</th>
                  <th key="count">Learners Sponsored</th>
                  <th key="bar">Share</th>
                </tr>
              </thead>
              <tbody>
                {sponsorBreakdown.map((s: any, i: number) => {
                  const total = sponsorBreakdown.reduce((sum: number, x: any) => sum + x.count, 0);
                  const pct   = total ? Math.round(s.count / total * 100) : 0;
                  return (
                    <tr key={i}>
                      <td key="name" className="font-semibold text-gray-800">{s.name}</td>
                      <td key="count" className="font-mono font-bold text-brand-700">{s.count}</td>
                      <td key="bar" className="w-48">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-mono text-gray-500 w-8">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Learner export */}
      {tab === 'learners' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
          <Users className="w-12 h-12 text-brand-300 mx-auto" />
          <div>
            <h2 className="text-base font-bold text-gray-800">Full Learner Export</h2>
            <p className="text-sm text-gray-500 mt-1">
              Export all {rawLearners.length} learners with their attendance rate, average score, risk level and school.
            </p>
          </div>
          <button onClick={exportLearners} className="btn-primary mx-auto">
            <Download className="w-4 h-4" /> Download CSV ({rawLearners.length} rows)
          </button>
        </div>
      )}

      {/* Assessment export */}
      {tab === 'assessments' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
          <BarChart3 className="w-12 h-12 text-blue-300 mx-auto" />
          <div>
            <h2 className="text-base font-bold text-gray-800">Assessment Scores Export</h2>
            <p className="text-sm text-gray-500 mt-1">
              Export all {rawAssessments.length} assessment records with dates, subjects, scores and grade bands.
            </p>
          </div>
          <button onClick={exportAssessments} className="btn-primary mx-auto">
            <Download className="w-4 h-4" /> Download CSV ({rawAssessments.length} rows)
          </button>
        </div>
      )}
    </div>
  );
}
