'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { DS } from '@/components/platform/tokens';
import { fmt } from '@/utils';
import {
  ChevronDown, ChevronRight, GraduationCap, Plus, Loader2,
  CheckCircle2, BookOpen, Briefcase, Users,
} from 'lucide-react';
import type { AlumniRow } from './page';

const SURVEY_TYPES = ['exit', '6_month', '1_year', '3_year'] as const;
const SURVEY_LABELS: Record<string, string> = {
  exit: 'Exit Survey', '6_month': '6-Month', '1_year': '1-Year', '3_year': '3-Year',
};
const STATUS_COLORS: Record<string, string> = {
  completed: 'var(--ds-success)', withdrawn: 'var(--ds-danger)', transferred: 'var(--ds-warn)',
};

interface UnrecordedLearner { learner_id: string; learner_code: string; grade: number; name: string; school: string }

interface Props {
  alumni:      AlumniRow[];
  unrecorded:  UnrecordedLearner[];
}

// ─── Add alumni form ──────────────────────────────────────────────────────────
function AddAlumniForm({ learner, onDone }: { learner: UnrecordedLearner; onDone: () => void }) {
  const [form, setForm] = useState({
    graduated_at:         new Date().toISOString().slice(0, 10),
    final_status:         'completed' as string,
    higher_ed_enrolled:   null as boolean | null,
    institution:          '',
    career_field:         '',
    consent_for_followup: true,
    notes:                '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/v1/alumni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, learner_id: learner.learner_id }),
      });
      if (!res.ok) throw new Error();
      toast.success('Alumni record created');
      onDone();
    } catch {
      toast.error('Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl p-5 space-y-4"
      style={{ background: DS.surface, border: `1px solid ${DS.primaryBorder}` }}>
      <p className="text-sm font-bold" style={{ color: DS.text }}>
        Record graduation — {learner.name}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: DS.textMuted }}>Graduation date</label>
          <input type="date" value={form.graduated_at}
            onChange={e => setForm(f => ({ ...f, graduated_at: e.target.value }))}
            className="form-input w-full text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: DS.textMuted }}>Status</label>
          <select value={form.final_status}
            onChange={e => setForm(f => ({ ...f, final_status: e.target.value }))}
            className="form-select w-full text-sm">
            <option value="completed">Completed</option>
            <option value="withdrawn">Withdrawn</option>
            <option value="transferred">Transferred</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: DS.textMuted }}>Institution (if applicable)</label>
          <input type="text" value={form.institution}
            onChange={e => setForm(f => ({ ...f, institution: e.target.value }))}
            placeholder="University / College"
            className="form-input w-full text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: DS.textMuted }}>Career interest</label>
          <input type="text" value={form.career_field}
            onChange={e => setForm(f => ({ ...f, career_field: e.target.value }))}
            placeholder="e.g. Engineering, Medicine"
            className="form-input w-full text-sm" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: DS.textMid }}>
          <input type="checkbox" checked={form.consent_for_followup}
            onChange={e => setForm(f => ({ ...f, consent_for_followup: e.target.checked }))} />
          Consented to follow-up contact
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: DS.textMid }}>
          <input type="checkbox" checked={form.higher_ed_enrolled === true}
            onChange={e => setForm(f => ({ ...f, higher_ed_enrolled: e.target.checked ? true : null }))} />
          Enrolled in higher education
        </label>
      </div>

      <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
        placeholder="Any additional notes…" rows={2}
        className="form-input w-full text-sm resize-none" />

      <div className="flex gap-2">
        <button onClick={onDone}
          className="flex-1 py-2 rounded-xl text-sm font-semibold cursor-pointer"
          style={{ background: DS.surfaceHover, color: DS.textMid }}>
          Cancel
        </button>
        <button onClick={save} disabled={saving}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer flex items-center justify-center gap-2"
          style={{ background: DS.primary, color: '#fff', opacity: saving ? 0.7 : 1 }}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : 'Save Record'}
        </button>
      </div>
    </div>
  );
}

// ─── Survey button ────────────────────────────────────────────────────────────
function LogSurveyButton({ alumniId, surveyType, existing }: { alumniId: string; surveyType: string; existing: boolean }) {
  const [open,   setOpen]   = useState(false);
  const [impact, setImpact] = useState<number>(3);
  const [stem,   setStem]   = useState<boolean | null>(null);
  const [notes,  setNotes]  = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/alumni/${alumniId}/surveys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survey_type: surveyType,
          programme_impact: impact,
          stem_career: stem,
          notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Survey saved');
      setOpen(false);
      window.location.reload();
    } catch {
      toast.error('Could not save survey');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer transition-all"
        style={existing
          ? { background: 'var(--ds-success-light)', color: 'var(--ds-success)', border: '1px solid var(--ds-success)' }
          : { background: DS.surfaceHover, color: DS.textMuted, border: `1px solid ${DS.border}` }}>
        {existing ? '✓ ' : '+ '}{SURVEY_LABELS[surveyType]}
      </button>
    );
  }

  return (
    <div className="col-span-full rounded-xl p-4 space-y-3 mt-2"
      style={{ background: DS.surfaceHover, border: `1px solid ${DS.border}` }}>
      <p className="text-xs font-bold" style={{ color: DS.text }}>{SURVEY_LABELS[surveyType]}</p>
      <div>
        <p className="text-[10px] font-semibold mb-1" style={{ color: DS.textMuted }}>
          Programme impact (1 = no impact, 5 = life-changing)
        </p>
        <div className="flex gap-1.5">
          {[1,2,3,4,5].map(n => (
            <button key={n} type="button" onClick={() => setImpact(n)}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
              style={impact === n
                ? { background: DS.primary, color: '#fff' }
                : { background: DS.surface, color: DS.textMuted, border: `1px solid ${DS.border}` }}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: DS.textMid }}>
        <input type="checkbox" checked={stem === true}
          onChange={e => setStem(e.target.checked ? true : null)} />
        Currently working / studying in STEM
      </label>
      <textarea value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Optional notes…" rows={2}
        className="form-input w-full text-xs resize-none" />
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)}
          className="py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer"
          style={{ background: DS.surface, color: DS.textMid }}>
          Cancel
        </button>
        <button onClick={save} disabled={saving}
          className="flex-1 py-1.5 rounded-lg text-xs font-bold cursor-pointer flex items-center justify-center gap-2"
          style={{ background: DS.primary, color: '#fff', opacity: saving ? 0.7 : 1 }}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
          Save Survey
        </button>
      </div>
    </div>
  );
}

// ─── Alumni card ──────────────────────────────────────────────────────────────
function AlumniCard({ a }: { a: AlumniRow }) {
  const [open, setOpen] = useState(false);
  const surveyMap = Object.fromEntries(a.surveys.map(s => [s.survey_type, s]));

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
      <button className="w-full flex items-center gap-3 p-4 cursor-pointer text-left"
        onClick={() => setOpen(o => !o)}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: DS.primaryLight }}>
          <GraduationCap className="w-4 h-4" style={{ color: DS.primary }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: DS.text }}>{a.name}</p>
          <p className="text-xs" style={{ color: DS.textMuted }}>
            {a.school} · Grade {a.grade} · {a.learner_code}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize"
            style={{ background: `${STATUS_COLORS[a.final_status]}20`, color: STATUS_COLORS[a.final_status] }}>
            {a.final_status}
          </span>
          <span className="text-xs" style={{ color: DS.textMuted }}>{fmt.date(a.graduated_at)}</span>
          {open ? <ChevronDown className="w-4 h-4" style={{ color: DS.textMuted }} />
                : <ChevronRight className="w-4 h-4" style={{ color: DS.textMuted }} />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4" style={{ borderTop: `1px solid ${DS.borderLight}` }}>
          {/* Outcome badges */}
          <div className="flex flex-wrap gap-2 pt-3">
            {a.higher_ed_enrolled && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(124,58,237,0.15)', color: '#7C3AED' }}>
                <BookOpen className="w-3 h-3" /> Higher Education
              </span>
            )}
            {a.employed_in_stem && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'var(--ds-success-light)', color: 'var(--ds-success)' }}>
                <Briefcase className="w-3 h-3" /> STEM Career
              </span>
            )}
            {a.institution && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: DS.surfaceHover, color: DS.textMid }}>
                {a.institution}
              </span>
            )}
            {a.career_field && (
              <span className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: DS.surfaceHover, color: DS.textMuted }}>
                {a.career_field}
              </span>
            )}
          </div>

          {/* Follow-up surveys */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: DS.textMuted }}>
              Follow-up Surveys
            </p>
            <div className="flex flex-wrap gap-2">
              {SURVEY_TYPES.map(t => (
                <LogSurveyButton
                  key={t}
                  alumniId={a.alumni_id}
                  surveyType={t}
                  existing={!!surveyMap[t]}
                />
              ))}
            </div>
          </div>

          {a.notes && (
            <p className="text-xs italic" style={{ color: DS.textMuted }}>&quot;{a.notes}&quot;</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────
export default function AlumniClient({ alumni, unrecorded }: Props) {
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [search,    setSearch]    = useState('');

  const filtered = alumni.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.school.toLowerCase().includes(search.toLowerCase()) ||
    a.learner_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Unrecorded graduates banner */}
      {unrecorded.length > 0 && (
        <div className="rounded-2xl p-4 space-y-3"
          style={{ background: 'var(--ds-warn-light)', border: '1px solid var(--ds-warn)' }}>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: 'var(--ds-warn)' }} />
            <p className="text-sm font-bold" style={{ color: 'var(--ds-warn)' }}>
              {unrecorded.length} graduate{unrecorded.length !== 1 ? 's' : ''} without an alumni record
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {unrecorded.map(l => (
              <div key={l.learner_id}>
                {addingFor === l.learner_id ? (
                  <AddAlumniForm learner={l} onDone={() => { setAddingFor(null); window.location.reload(); }} />
                ) : (
                  <button onClick={() => setAddingFor(l.learner_id)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer"
                    style={{ background: 'var(--ds-warn)', color: '#fff' }}>
                    <Plus className="w-3 h-3" /> {l.name || l.learner_code}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      {alumni.length > 0 && (
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search alumni by name, school or code…"
          className="form-input w-full max-w-sm text-sm"
        />
      )}

      {/* Alumni list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: DS.textMuted }} />
          <p className="text-sm font-semibold" style={{ color: DS.textMuted }}>
            {alumni.length === 0 ? 'No alumni records yet' : 'No matches'}
          </p>
          {alumni.length === 0 && (
            <p className="text-xs mt-1" style={{ color: DS.textMuted }}>
              Alumni are created when a learner is marked as graduated.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => <AlumniCard key={a.alumni_id} a={a} />)}
        </div>
      )}
    </div>
  );
}
