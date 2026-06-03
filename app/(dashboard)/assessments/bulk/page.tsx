'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, Download, X } from 'lucide-react';
import Link from 'next/link';

interface Program { program_id:string; program_name:string }
interface Row     { learner_id:string; full_name:string; learner_code:string; score:string; notes:string }

const SUBJECTS  = ['Coding','Robotics','Mathematics','Science','Design','Electronics','AI/ML','Project Work','Practical','Written Test','Assignment','Other'];
const TYPES     = [['test','📝 Test'],['quiz','⚡ Quiz'],['project','🚀 Project'],['practical','🔬 Practical'],['assignment','📋 Assignment'],['oral','🗣️ Oral'],['other','📄 Other']] as const;
const DIFFS     = [['easy','Easy'],['medium','Medium'],['hard','Hard'],['advanced','Advanced']] as const;
const SKILLS    = ['Logic','Syntax','Debugging','Problem Solving','Data Structures','Algorithms','Robotics','Electronics','Mathematics','Science','Design Thinking','Presentation','Research','Collaboration'];
const GRADE_BAND = (p: number|null) => p===null?null : p>=80?'Distinction':p>=70?'Merit':p>=50?'Pass':'Needs Support';
const BAND_STYLE: Record<string,string> = { Distinction:'bg-green-50 text-green-700', Merit:'bg-blue-50 text-blue-700', Pass:'bg-yellow-50 text-yellow-700', 'Needs Support':'bg-red-50 text-red-700' };

export default function BulkAssessmentsPage() {
  const [programs,  setPrograms]  = useState<Program[]>([]);
  const [programId, setProgramId] = useState('');
  const [subject,   setSubject]   = useState('');
  const [type,      setType]      = useState('test');
  const [diff,      setDiff]      = useState('medium');
  const [skills,    setSkills]    = useState<string[]>([]);
  const [maxScore,  setMaxScore]  = useState('100');
  const [date,      setDate]      = useState(new Date().toISOString().slice(0,10));
  const [term,      setTerm]      = useState('');
  const [rows,      setRows]      = useState<Row[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [loadingLrn,setLoadingLrn]= useState(false);
  const [saved,     setSaved]     = useState(false);

  useEffect(() => {
    fetch('/api/v1/programs?limit=100').then(r=>r.json()).then(j=>setPrograms(j.data||[]));
  }, []);

  useEffect(() => {
    if (!programId) { setRows([]); return; }
    setLoadingLrn(true);
    fetch(`/api/v1/programs/${programId}/learners`)
      .then(r=>r.json())
      .then(j => setRows((j.data||[]).map((l:any) => ({ learner_id:l.learner_id, full_name:l.full_name, learner_code:l.learner_code, score:'', notes:'' }))))
      .finally(()=>setLoadingLrn(false));
  }, [programId]);

  const setRow = (id:string, field:'score'|'notes', val:string) =>
    setRows(prev => prev.map(r => r.learner_id===id ? {...r,[field]:val} : r));
  const pct = (score:string) => { const s=Number(score),m=Number(maxScore); return score&&!isNaN(s)&&m>0?Math.round(s/m*100):null; };
  const toggleSkill = (sk:string) => setSkills(prev => prev.includes(sk) ? prev.filter(s=>s!==sk) : [...prev,sk]);

  const filledRows = rows.filter(r => r.score.trim()!=='');
  const classAvg   = filledRows.length ? Math.round(filledRows.reduce((s,r)=>s+(pct(r.score)||0),0)/filledRows.length) : null;

  const handleSave = async () => {
    if (!programId)  { toast.error('Select a programme'); return; }
    if (!subject)    { toast.error('Select a subject');   return; }
    if (!filledRows.length) { toast.error('Enter at least one score'); return; }

    setLoading(true);
    try {
      let count = 0;
      for (const r of filledRows) {
        const p = pct(r.score);
        const res = await fetch('/api/v1/assessments', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            learner_id:      r.learner_id,
            program_id:      programId,
            subject,
            assessment_type: type,
            difficulty:      diff,
            skill_tags:      skills.length > 0 ? skills : undefined,
            score:           Number(r.score),
            max_score:       Number(maxScore),
            percentage:      p,
            grade_band:      GRADE_BAND(p),
            assessment_date: date,
            term:            term ? Number(term) : undefined,
            notes:           r.notes || undefined,
          }),
        });
        if (res.ok) count++;
      }
      toast.success(`${count} assessment${count!==1?'s':''} saved`);
      if (classAvg !== null && classAvg < 50) {
        toast.warning(`Class average ${classAvg}% — consider reviewing support needs.`);
      }
      setSaved(true);
    } catch { toast.error('Save failed'); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    const header = ['Code','Name','Score',`Max (${maxScore})`,'%','Grade'];
    const data   = rows.map(r => { const p=pct(r.score); return [r.learner_code,r.full_name,r.score,maxScore,p??'',GRADE_BAND(p)??'']; });
    const csv    = [header,...data].map(row=>row.map(c=>`"${c}"`).join(',')).join('\n');
    const a      = document.createElement('a');
    a.href       = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download   = `marks_${subject}_${date}.csv`;
    a.click();
  };

  if (saved) return (
    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm max-w-md mx-auto">
      <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
        <Save className="w-7 h-7 text-green-600" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Marks Saved!</h3>
      {classAvg !== null && (
        <p className="text-sm text-gray-500 mb-2">Class average: <strong className={classAvg>=70?'text-green-600':classAvg>=50?'text-yellow-600':'text-red-600'}>{classAvg}%</strong></p>
      )}
      <div className="flex gap-3 justify-center mt-4">
        <button onClick={() => { setSaved(false); setRows(prev=>prev.map(r=>({...r,score:'',notes:''}))); }}
          className="btn-primary">Capture Another</button>
        <Link href="/assessments" className="btn-secondary">View Analytics</Link>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/assessments" className="text-sm text-gray-500 hover:text-gray-700">← Back</Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Capture Marks</h1>
          <p className="text-sm text-gray-500 mt-0.5">Record assessment results for your learners</p>
        </div>
      </div>

      {/* Assessment config */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Assessment Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Programme <span className="text-red-500">*</span></label>
            <select value={programId} onChange={e=>setProgramId(e.target.value)} className="form-select">
              <option value="">Select programme…</option>
              {programs.map(p => <option key={p.program_id} value={p.program_id}>{p.program_name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Subject <span className="text-red-500">*</span></label>
            <select value={subject} onChange={e=>setSubject(e.target.value)} className="form-select">
              <option value="">Select subject…</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Assessment Type</label>
            <select value={type} onChange={e=>setType(e.target.value)} className="form-select">
              {TYPES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Difficulty</label>
            <select value={diff} onChange={e=>setDiff(e.target.value)} className="form-select">
              {DIFFS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Total Marks</label>
            <input type="number" value={maxScore} onChange={e=>setMaxScore(e.target.value)} className="form-input" min={1} max={1000} />
          </div>
          <div>
            <label className="form-label">Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="form-input" />
          </div>
          <div>
            <label className="form-label">Term (optional)</label>
            <select value={term} onChange={e=>setTerm(e.target.value)} className="form-select">
              <option value="">—</option>
              {[1,2,3,4].map(t => <option key={t} value={t}>Term {t}</option>)}
            </select>
          </div>
        </div>

        {/* Skill tags */}
        <div>
          <label className="form-label">Skills Assessed (select all that apply)</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {SKILLS.map(sk => (
              <button key={sk} type="button" onClick={() => toggleSkill(sk)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
                  skills.includes(sk)
                    ? 'bg-brand-700 text-white border-brand-700'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-brand-400'
                }`}>
                {sk}
              </button>
            ))}
          </div>
          {skills.length > 0 && (
            <button onClick={() => setSkills([])} className="text-xs text-gray-400 hover:text-gray-600 mt-1 flex items-center gap-1">
              <X className="w-3 h-3" /> Clear skills
            </button>
          )}
        </div>
      </div>

      {/* Marks grid */}
      {programId && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-gray-800">{rows.length} Learners</h2>
              {classAvg !== null && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${classAvg>=70?'bg-green-50 text-green-700':classAvg>=50?'bg-yellow-50 text-yellow-700':'bg-red-50 text-red-700'}`}>
                  Avg: {classAvg}%
                </span>
              )}
              <span className="text-xs text-gray-400">{filledRows.length} entered</span>
            </div>
            <div className="flex gap-2">
              <button onClick={exportCSV} disabled={!filledRows.length} className="btn-secondary text-xs"><Download className="w-3.5 h-3.5" /> CSV</button>
              <button onClick={() => setRows(p => p.map(r=>({...r,score:maxScore})))} className="btn-secondary text-xs">Fill max</button>
              <button onClick={() => setRows(p => p.map(r=>({...r,score:''})))} className="btn-secondary text-xs">Clear</button>
            </div>
          </div>

          {loadingLrn ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>
          ) : rows.length === 0 ? (
            <p className="text-center py-12 text-gray-400">No learners enrolled in this programme</p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Learner</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 w-28">Score/{maxScore}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 w-16">%</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 w-28">Grade</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 hidden sm:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const p = pct(r.score);
                  const g = GRADE_BAND(p);
                  const scoreColor = p===null?'text-gray-300':p>=80?'text-green-600':p>=70?'text-blue-600':p>=50?'text-yellow-600':'text-red-600';
                  return (
                    <tr key={r.learner_id} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs text-gray-400">{i+1}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-800">{r.full_name}</p>
                        <p className="text-xs font-mono text-gray-400">{r.learner_code}</p>
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" value={r.score} min={0} max={Number(maxScore)}
                          onChange={e => setRow(r.learner_id,'score',e.target.value)}
                          placeholder="—"
                          className="w-20 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 font-mono" />
                      </td>
                      <td className={`px-4 py-3 font-mono font-bold text-sm ${scoreColor}`}>{p!==null?`${p}%`:'—'}</td>
                      <td className="px-4 py-3">{g ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BAND_STYLE[g]}`}>{g}</span> : <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <input type="text" value={r.notes} onChange={e=>setRow(r.learner_id,'notes',e.target.value)}
                          placeholder="Optional note…"
                          className="w-full text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400 max-w-xs" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {rows.length > 0 && (
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-4">
              <p className="text-xs text-gray-500">
                {filledRows.length} of {rows.length} entered{classAvg!==null?` · Avg: ${classAvg}%`:''}
                {skills.length > 0 && ` · Skills: ${skills.join(', ')}`}
              </p>
              <button onClick={handleSave} disabled={loading||!filledRows.length} className="btn-primary">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {loading ? 'Saving…' : `Save ${filledRows.length} Mark${filledRows.length!==1?'s':''}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
