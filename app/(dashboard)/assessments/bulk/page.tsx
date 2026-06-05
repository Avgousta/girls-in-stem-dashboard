'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, Download, X } from 'lucide-react';
import Link from 'next/link';
import { DS } from '@/components/platform/tokens';

interface Program { program_id:string; program_name:string }
interface Row     { learner_id:string; full_name:string; learner_code:string; score:string; notes:string }

const SUBJECTS  = ['Coding','Robotics','Mathematics','Science','Design','Electronics','AI/ML','Project Work','Practical','Written Test','Assignment','Other'];
const TYPES     = [['test','📝 Test'],['quiz','⚡ Quiz'],['project','🚀 Project'],['practical','🔬 Practical'],['assignment','📋 Assignment'],['oral','🗣️ Oral'],['other','📄 Other']] as const;
const DIFFS     = [['easy','Easy'],['medium','Medium'],['hard','Hard'],['advanced','Advanced']] as const;
const SKILLS    = ['Logic','Syntax','Debugging','Problem Solving','Data Structures','Algorithms','Robotics','Electronics','Mathematics','Science','Design Thinking','Presentation','Research','Collaboration'];
const GRADE_BAND = (p: number|null) => p===null?null : p>=80?'Distinction':p>=70?'Merit':p>=50?'Pass':'Needs Support';
const scoreColor = (p: number|null) => p===null ? DS.textMuted as string : p>=80 ? 'var(--ds-success)' : p>=70 ? '#818CF8' : p>=50 ? 'var(--ds-warn)' : 'var(--ds-danger)';
const BAND_STYLE: Record<string,{color:string;bg:string}> = {
  Distinction:   { color:'var(--ds-success)', bg:'var(--ds-success-light)' },
  Merit:         { color:'#818CF8',            bg:'rgba(129,140,248,0.15)' },
  Pass:          { color:'var(--ds-warn)',     bg:'var(--ds-warn-light)'   },
  'Needs Support':{ color:'var(--ds-danger)',  bg:'var(--ds-danger-light)' },
};

const labelSt: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  marginBottom: '5px', color: DS.textMuted as string,
};
const selectSt: React.CSSProperties = {
  width: '100%', background: DS.surfaceHover as string, color: DS.text as string,
  border: `1px solid ${DS.border}`, borderRadius: '10px',
  padding: '8px 10px', fontSize: '13px', outline: 'none',
};
const inputSt: React.CSSProperties = {
  width: '100%', background: DS.surfaceHover as string, color: DS.text as string,
  border: `1px solid ${DS.border}`, borderRadius: '10px',
  padding: '8px 10px', fontSize: '13px', outline: 'none',
};
const thSt: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.08em', color: DS.textMuted as string,
  borderBottom: `1px solid ${DS.border}`, background: DS.surfaceHover as string,
};

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
    <div className="text-center py-16 rounded-2xl max-w-md mx-auto"
      style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
      <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: 'var(--ds-success-light)' }}>
        <Save className="w-7 h-7" style={{ color: 'var(--ds-success)' }} />
      </div>
      <h3 className="text-xl font-bold mb-2" style={{ color: DS.text }}>Marks Saved!</h3>
      {classAvg !== null && (
        <p className="text-sm mb-2" style={{ color: DS.textMuted }}>
          Class average: <strong style={{ color: scoreColor(classAvg) }}>{classAvg}%</strong>
        </p>
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
        <Link href="/assessments" className="text-sm hover:underline" style={{ color: DS.textMuted }}>← Back</Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: DS.text }}>Capture Marks</h1>
          <p className="text-sm mt-0.5" style={{ color: DS.textMuted }}>Record assessment results for your learners</p>
        </div>
      </div>

      {/* Assessment config */}
      <div className="rounded-2xl p-5 space-y-5" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: DS.textMuted }}>Assessment Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label style={labelSt}>Programme <span style={{ color: 'var(--ds-danger)' }}>*</span></label>
            <select value={programId} onChange={e=>setProgramId(e.target.value)} style={selectSt}>
              <option value="">Select programme…</option>
              {programs.map(p => <option key={p.program_id} value={p.program_id}>{p.program_name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelSt}>Subject <span style={{ color: 'var(--ds-danger)' }}>*</span></label>
            <select value={subject} onChange={e=>setSubject(e.target.value)} style={selectSt}>
              <option value="">Select subject…</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelSt}>Assessment Type</label>
            <select value={type} onChange={e=>setType(e.target.value)} style={selectSt}>
              {TYPES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={labelSt}>Difficulty</label>
            <select value={diff} onChange={e=>setDiff(e.target.value)} style={selectSt}>
              {DIFFS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={labelSt}>Total Marks</label>
            <input type="number" value={maxScore} onChange={e=>setMaxScore(e.target.value)}
              style={inputSt} min={1} max={1000} />
          </div>
          <div>
            <label style={labelSt}>Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inputSt} />
          </div>
          <div>
            <label style={labelSt}>Term (optional)</label>
            <select value={term} onChange={e=>setTerm(e.target.value)} style={selectSt}>
              <option value="">—</option>
              {[1,2,3,4].map(t => <option key={t} value={t}>Term {t}</option>)}
            </select>
          </div>
        </div>

        {/* Skill tags */}
        <div>
          <label style={labelSt}>Skills Assessed (select all that apply)</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {SKILLS.map(sk => (
              <button key={sk} type="button" onClick={() => toggleSkill(sk)}
                className="text-xs font-semibold px-2.5 py-1 rounded-full transition-all cursor-pointer"
                style={skills.includes(sk)
                  ? { background: DS.primary, color: '#fff', border: `1px solid ${DS.primary}` }
                  : { background: DS.surfaceHover as string, color: DS.textMid as string, border: `1px solid ${DS.border}` }}>
                {sk}
              </button>
            ))}
          </div>
          {skills.length > 0 && (
            <button onClick={() => setSkills([])} className="text-xs flex items-center gap-1 mt-2 cursor-pointer"
              style={{ color: DS.textMuted }}>
              <X className="w-3 h-3" /> Clear skills
            </button>
          )}
        </div>
      </div>

      {/* Marks grid */}
      {programId && (
        <div className="rounded-2xl overflow-hidden" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <div className="flex items-center justify-between px-5 py-4 flex-wrap gap-3"
            style={{ borderBottom: `1px solid ${DS.border}` }}>
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold" style={{ color: DS.text }}>{rows.length} Learners</h2>
              {classAvg !== null && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: classAvg>=70?'var(--ds-success-light)':classAvg>=50?'var(--ds-warn-light)':'var(--ds-danger-light)',
                           color:      classAvg>=70?'var(--ds-success)':classAvg>=50?'var(--ds-warn)':'var(--ds-danger)' }}>
                  Avg: {classAvg}%
                </span>
              )}
              <span className="text-xs" style={{ color: DS.textMuted }}>{filledRows.length} entered</span>
            </div>
            <div className="flex gap-2">
              <button onClick={exportCSV} disabled={!filledRows.length} className="btn-secondary text-xs">
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button onClick={() => setRows(p => p.map(r=>({...r,score:maxScore})))} className="btn-secondary text-xs">Fill max</button>
              <button onClick={() => setRows(p => p.map(r=>({...r,score:''})))} className="btn-secondary text-xs">Clear</button>
            </div>
          </div>

          {loadingLrn ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: DS.primary }} />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center py-12 text-sm" style={{ color: DS.textMuted }}>No learners enrolled in this programme</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  {['#','Learner',`Score/${maxScore}`,'%','Grade','Notes'].map((h,i) => (
                    <th key={h} style={{ ...thSt, display: i===5?undefined:undefined }} className={i===5?'hidden sm:table-cell':undefined}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const p = pct(r.score);
                  const g = GRADE_BAND(p);
                  const bs = g ? BAND_STYLE[g] : null;
                  return (
                    <tr key={r.learner_id}
                      style={{ borderBottom: `1px solid ${DS.borderLight}` }}
                      onMouseOver={e => { (e.currentTarget as HTMLTableRowElement).style.background = DS.surfaceHover as string; }}
                      onMouseOut={e =>  { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}>
                      <td className="px-4 py-3 text-xs" style={{ color: DS.textMuted }}>{i+1}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold" style={{ color: DS.text }}>{r.full_name}</p>
                        <p className="text-xs font-mono" style={{ color: DS.textMuted }}>{r.learner_code}</p>
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" value={r.score} min={0} max={Number(maxScore)}
                          onChange={e => setRow(r.learner_id,'score',e.target.value)}
                          placeholder="—"
                          className="w-20 text-sm font-mono rounded-lg px-3 py-1.5 focus:outline-none"
                          style={{ background: DS.surfaceHover as string, border: `1px solid ${DS.border}`, color: DS.text as string }} />
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-sm"
                        style={{ color: scoreColor(p) }}>{p!==null?`${p}%`:'—'}</td>
                      <td className="px-4 py-3">
                        {g && bs
                          ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: bs.bg, color: bs.color }}>{g}</span>
                          : <span style={{ color: DS.borderLight }}>—</span>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <input type="text" value={r.notes} onChange={e=>setRow(r.learner_id,'notes',e.target.value)}
                          placeholder="Optional note…"
                          className="text-xs rounded px-2 py-1 focus:outline-none max-w-xs w-full"
                          style={{ background: DS.surfaceHover as string, border: `1px solid ${DS.border}`, color: DS.text as string }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {rows.length > 0 && (
            <div className="px-5 py-4 flex items-center justify-between gap-4"
              style={{ borderTop: `1px solid ${DS.border}` }}>
              <p className="text-xs" style={{ color: DS.textMuted }}>
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
