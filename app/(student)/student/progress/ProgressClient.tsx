'use client';
import { useState } from 'react';
import { useTheme } from '../../StudentThemeProvider';

interface Assessment { assessment_id:string; subject:string; assessment_type:string; difficulty:string|null; skill_tags:string[]|null; score:number|null; max_score:number|null; percentage:number|null; grade_band:string|null; assessment_date:string|null; term:number|null; notes:string|null; feedback_strengths:string|null; feedback_improvements:string|null; feedback_actions:string|null; programs:{ program_name:string }|null }
interface AttendanceRow { status: string; session_date: string; programs: { program_name: string } | null }
interface Props { assessments:Assessment[]; attendance:AttendanceRow[] }

function scoreColor(v: number) { return v>=80?'#2DD4A0':v>=70?'#60A5FA':v>=50?'#FCD34D':'#F87171'; }

const GRADE_CFG: Record<string,{color:string;bg:string}> = {
  'Distinction':   { color:'#2DD4A0', bg:'rgba(45,212,160,0.12)'  },
  'Merit':         { color:'#60A5FA', bg:'rgba(96,165,250,0.12)'  },
  'Pass':          { color:'#FCD34D', bg:'rgba(252,211,77,0.12)'  },
  'Needs Support': { color:'#F87171', bg:'rgba(248,113,113,0.12)' },
};

const TYPE_EMOJI: Record<string,string> = { quiz:'⚡', test:'📝', project:'🚀', practical:'🔬', assignment:'📋', oral:'🗣️', other:'📄' };

function SparkLine({ data, color }: { data:number[]; color:string }) {
  if (data.length < 2) return null;
  const w=300,h=60,padX=8,padY=8;
  const pts = data.map((v,i) => {
    const x = padX+(i/(data.length-1))*(w-padX*2);
    const y = h-padY-((v-0)/(100-0))*(h-padY*2);
    return `${x},${y}`;
  });
  const path = 'M '+pts.join(' L ');
  const area = `${path} L ${w-padX},${h-padY} L ${padX},${h-padY} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto overflow-visible">
      <defs>
        <linearGradient id="sgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sgrad)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v,i) => {
        const x=padX+(i/(data.length-1))*(w-padX*2);
        const y=h-padY-((v-0)/(100-0))*(h-padY*2);
        return <circle key={i} cx={x} cy={y} r="4" fill={color} stroke="rgba(8,8,20,0.8)" strokeWidth="2" />;
      })}
    </svg>
  );
}

export default function ProgressClient({ assessments, attendance }: Props) {
  const { theme, accentColor } = useTheme();
  const [tab, setTab] = useState<'all'|'distinction'|'pass'|'support'>('all');
  const [expanded, setExpanded] = useState<string|null>(null);

  const sorted  = [...assessments].sort((a,b) => (b.assessment_date||'').localeCompare(a.assessment_date||''));
  const avgScore= assessments.length ? Math.round(assessments.reduce((s,a)=>s+Number(a.percentage||0),0)/assessments.length) : 0;
  const attRate = attendance.length ? Math.round(attendance.filter((a:any)=>a.status==='present').length/attendance.length*100) : 0;

  // Grade band counts
  const bands: Record<string,number> = { Distinction:0, Merit:0, Pass:0, 'Needs Support':0 };
  assessments.forEach(a => { if (a.grade_band && bands[a.grade_band]!==undefined) bands[a.grade_band]++; });

  // Trend sparkline
  const trendData = [...assessments].sort((a,b)=>(a.assessment_date??'').localeCompare(b.assessment_date??'')).slice(-12).map(a=>Number(a.percentage||0));

  // Skill breakdown
  const skillMap: Record<string,number[]> = {};
  assessments.forEach(a => {
    (a.skill_tags||[]).forEach((sk: string) => {
      if (!skillMap[sk]) skillMap[sk]=[];
      skillMap[sk].push(Number(a.percentage||0));
    });
  });
  const skillStats = Object.entries(skillMap).map(([name,scores]) => ({
    name, avg:Math.round(scores.reduce((s,v)=>s+v,0)/scores.length), count:scores.length,
  })).sort((a,b)=>a.avg-b.avg);

  // Subject breakdown
  const subjectMap: Record<string,number[]> = {};
  assessments.forEach(a => {
    if (!subjectMap[a.subject]) subjectMap[a.subject]=[];
    subjectMap[a.subject].push(Number(a.percentage||0));
  });
  const subjects = Object.entries(subjectMap).map(([name,scores]) => ({
    name, avg:Math.round(scores.reduce((s,v)=>s+v,0)/scores.length), count:scores.length,
  })).sort((a,b)=>b.count-a.count);

  const filtered = sorted.filter(a => {
    if (tab==='all')         return true;
    if (tab==='distinction') return a.grade_band==='Distinction'||a.grade_band==='Merit';
    if (tab==='pass')        return a.grade_band==='Pass';
    return a.grade_band==='Needs Support';
  });

  const card: React.CSSProperties = { background:theme.cardBg, border:`1px solid ${theme.cardBorder}`, borderRadius:20 };

  const encouragement = avgScore>=80?'🔥 Outstanding performance!'
    :avgScore>=70?'💪 Great work — keep it up!'
    :avgScore>=50?'📚 Good progress — aim higher.'
    :'⚠️ Let\'s work on this together.';

  return (
    <div className="space-y-5 pt-2">
      <div>
        <h1 className="text-2xl font-black" style={{ color:theme.textPrimary }}>My Progress 📈</h1>
        <p className="text-sm mt-0.5" style={{ color:theme.textMuted }}>{assessments.length} assessments · {attendance.length} sessions</p>
      </div>

      {/* Big score card */}
      <div className="rounded-3xl p-5 relative overflow-hidden"
        style={{ background:`${scoreColor(avgScore)}15`, border:`1px solid ${scoreColor(avgScore)}30` }}>
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage:'radial-gradient(circle,white 1.5px,transparent 1.5px)', backgroundSize:'18px 18px' }} />
        <div className="relative">
          <p className="text-7xl font-black tabular-nums" style={{ color:scoreColor(avgScore) }}>{avgScore}%</p>
          <p className="text-sm font-semibold mt-1" style={{ color:theme.textMuted }}>Overall Average</p>
          <p className="text-sm mt-1 font-medium" style={{ color:scoreColor(avgScore) }}>{encouragement}</p>
          <div className="flex gap-4 mt-3">
            <div>
              <p className="text-lg font-black tabular-nums" style={{ color:attRate>=75?'#2DD4A0':'#F87171' }}>{attRate}%</p>
              <p className="text-xs" style={{ color:theme.textMuted }}>Attendance</p>
            </div>
            <div>
              <p className="text-lg font-black tabular-nums" style={{ color:accentColor }}>{assessments.length}</p>
              <p className="text-xs" style={{ color:theme.textMuted }}>Assessments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label:'Attendance', value:`${attRate}%`, color:attRate>=75?'#2DD4A0':'#F87171', note:attRate>=75?'✓ On track':'⚠ Below 75%' },
          { label:'Assessments',value:assessments.length, color:accentColor, note:'Taken so far' },
        ].map(({ label, value, color, note }) => (
          <div key={label} style={card} className="p-4 text-center">
            <p className="text-3xl font-black tabular-nums" style={{ color }}>{value}</p>
            <p className="text-xs font-semibold mt-1" style={{ color:theme.textMuted }}>{label}</p>
            <p className="text-[10px] mt-0.5" style={{ color }}>{note}</p>
          </div>
        ))}
      </div>

      {/* Trend */}
      {trendData.length > 1 && (
        <div style={card} className="p-4">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color:theme.textMuted }}>Score Trend</p>
          <SparkLine data={trendData} color={scoreColor(avgScore)} />
          <div className="flex justify-between mt-1 text-[9px]" style={{ color:theme.textMuted }}>
            <span>Earliest</span><span>Most Recent</span>
          </div>
        </div>
      )}

      {/* Grade band breakdown */}
      <div style={card} className="p-4">
        <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color:theme.textMuted }}>Grade Breakdown</p>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(GRADE_CFG).map(([band, { color, bg }]) => (
            <div key={band} className="rounded-xl p-3" style={{ background:bg, border:`1px solid ${color}30` }}>
              <p className="text-2xl font-black" style={{ color }}>{bands[band]||0}</p>
              <p className="text-xs font-semibold mt-0.5" style={{ color }}>{band}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Skill breakdown */}
      {skillStats.length > 0 && (
        <div style={card} className="p-4">
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color:theme.textMuted }}>Skills Breakdown</p>
          <div className="space-y-3">
            {skillStats.map(({ name, avg, count }) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="font-semibold" style={{ color:theme.textPrimary }}>{name}</span>
                  <div className="flex items-center gap-2">
                    <span style={{ color:theme.textMuted }}>{count} result{count!==1?'s':''}</span>
                    <span className="font-black" style={{ color:scoreColor(avg) }}>{avg}%</span>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full" style={{ width:`${avg}%`, background:scoreColor(avg) }} />
                </div>
              </div>
            ))}
          </div>
          {skillStats.length > 0 && (
            <div className="mt-4 p-3 rounded-xl" style={{ background:`${scoreColor(skillStats[0].avg)}12`, border:`1px solid ${scoreColor(skillStats[0].avg)}25` }}>
              <p className="text-xs font-semibold" style={{ color:scoreColor(skillStats[0].avg) }}>
                💡 Focus area: <strong>{skillStats[0].name}</strong> ({skillStats[0].avg}%)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Subject breakdown */}
      {subjects.length > 1 && (
        <div style={card} className="p-4">
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color:theme.textMuted }}>By Subject</p>
          <div className="space-y-3">
            {subjects.map(({ name, avg, count }) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="font-semibold" style={{ color:theme.textPrimary }}>{name}</span>
                  <span className="font-black" style={{ color:scoreColor(avg) }}>{avg}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full" style={{ width:`${avg}%`, background:scoreColor(avg) }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter + assessment list */}
      {assessments.length > 0 && (
        <div>
          <div className="flex gap-1 p-1 rounded-2xl mb-3" style={card}>
            {([['all','All'],['distinction','Top'],['pass','Pass'],['support','Needs Work']] as const).map(([key,label]) => (
              <button key={key} onClick={() => setTab(key)}
                className="flex-1 py-2 px-2 rounded-xl text-[11px] font-bold transition-all"
                style={{ background:tab===key?accentColor:'transparent', color:tab===key?'white':theme.textMuted }}>
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color:theme.textMuted }}>No results in this category</p>
            ) : filtered.map(a => {
              const pct   = Number(a.percentage||0);
              const gc    = a.grade_band ? GRADE_CFG[a.grade_band] : { color:scoreColor(pct), bg:`${scoreColor(pct)}10` };
              const isExp = expanded === a.assessment_id;
              const hasFeedback = a.feedback_strengths || a.feedback_improvements || a.feedback_actions;
              return (
                <div key={a.assessment_id}>
                  <button onClick={() => setExpanded(isExp ? null : a.assessment_id)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all"
                    style={{ background:gc.bg, border:`1px solid ${gc.color}30` }}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">{TYPE_EMOJI[a.assessment_type]||'📝'}</span>
                      <div>
                        <p className="text-sm font-bold" style={{ color:theme.textPrimary }}>{a.subject}</p>
                        <p className="text-xs mt-0.5" style={{ color:theme.textMuted }}>
                          {a.assessment_date ? new Date(a.assessment_date).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                          {a.grade_band && ` · ${a.grade_band}`}
                          {hasFeedback && ` · 💬 Feedback`}
                        </p>
                      </div>
                    </div>
                    <span className="text-xl font-black tabular-nums shrink-0" style={{ color:gc.color }}>{pct}%</span>
                  </button>

                  {/* Expanded feedback */}
                  {isExp && (
                    <div className="mx-2 px-4 py-4 rounded-b-2xl space-y-3 -mt-1"
                      style={{ background:theme.cardBg, border:`1px solid ${theme.cardBorder}`, borderTop:'none' }}>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p style={{ color:theme.textMuted }}>Score</p>
                          <p className="font-bold mt-0.5" style={{ color:theme.textPrimary }}>{a.score}/{a.max_score}</p>
                        </div>
                        {a.programs?.program_name && (
                          <div>
                            <p style={{ color:theme.textMuted }}>Programme</p>
                            <p className="font-bold mt-0.5 truncate" style={{ color:theme.textPrimary }}>{a.programs.program_name}</p>
                          </div>
                        )}
                        {(a.skill_tags||[]).length > 0 && (
                          <div className="col-span-2">
                            <p style={{ color:theme.textMuted }} className="mb-1">Skills</p>
                            <div className="flex flex-wrap gap-1">
                              {(a.skill_tags||[]).map((sk:string) => (
                                <span key={sk} className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                                  style={{ background:`${accentColor}20`, color:accentColor }}>{sk}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {a.feedback_strengths && (
                        <div className="p-3 rounded-xl" style={{ background:'rgba(45,212,160,0.08)', border:'1px solid rgba(45,212,160,0.2)' }}>
                          <p className="text-[10px] font-bold text-green-400 uppercase tracking-wider mb-1">✅ What you did well</p>
                          <p className="text-sm" style={{ color:theme.textPrimary }}>{a.feedback_strengths}</p>
                        </div>
                      )}
                      {a.feedback_improvements && (
                        <div className="p-3 rounded-xl" style={{ background:'rgba(252,211,77,0.08)', border:'1px solid rgba(252,211,77,0.2)' }}>
                          <p className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider mb-1">📈 Areas to improve</p>
                          <p className="text-sm" style={{ color:theme.textPrimary }}>{a.feedback_improvements}</p>
                        </div>
                      )}
                      {a.feedback_actions && (
                        <div className="p-3 rounded-xl" style={{ background:'rgba(96,165,250,0.08)', border:'1px solid rgba(96,165,250,0.2)' }}>
                          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">🎯 What to do next</p>
                          <p className="text-sm" style={{ color:theme.textPrimary }}>{a.feedback_actions}</p>
                        </div>
                      )}
                      {!hasFeedback && (
                        <p className="text-xs text-center py-2" style={{ color:theme.textMuted }}>Your instructor hasn't added feedback yet</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {assessments.length === 0 && (
        <div className="text-center py-16">
          <p className="text-5xl mb-3">📊</p>
          <p className="font-bold" style={{ color:theme.textPrimary }}>No assessments yet</p>
          <p className="text-sm mt-1" style={{ color:theme.textMuted }}>Your results will appear here</p>
        </div>
      )}
    </div>
  );
}
