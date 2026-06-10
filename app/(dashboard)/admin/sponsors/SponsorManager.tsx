'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Users, Loader2, Award, X, Key, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { DS } from '@/components/platform/tokens';

interface SponsorUser { user_id: string; full_name: string; email: string; role: string }
interface Sponsor { sponsor_id: string; sponsor_name: string; learner_count: number; users: SponsorUser[] }
interface Learner  { learner_id: string; learner_code: string; full_name: string; school_name: string }
interface Props    { sponsors: Sponsor[]; allLearners: Learner[]; sponsorUsers: SponsorUser[] }

function sponsorColor(name: string) {
  const palettes = [
    { solid: '#7C3AED', border: 'rgba(124,58,237,0.4)', bg: 'rgba(124,58,237,0.12)', text: '#7C3AED' },
    { solid: '#2563EB', border: 'rgba(37,99,235,0.4)',  bg: 'rgba(37,99,235,0.12)',  text: '#2563EB' },
    { solid: '#16A34A', border: 'rgba(22,101,52,0.4)',  bg: 'rgba(22,101,52,0.12)',  text: '#16A34A' },
    { solid: '#CA8A04', border: 'rgba(202,138,4,0.4)',  bg: 'rgba(202,138,4,0.12)',  text: '#CA8A04' },
    { solid: '#DB2777', border: 'rgba(219,39,119,0.4)', bg: 'rgba(219,39,119,0.12)', text: '#DB2777' },
    { solid: '#EA580C', border: 'rgba(234,88,12,0.4)',  bg: 'rgba(234,88,12,0.12)',  text: '#EA580C' },
  ];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % palettes.length;
  return palettes[Math.abs(h) % palettes.length];
}

const labelSt: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  marginBottom: '5px', color: DS.textMuted as string,
};
const inputSt: React.CSSProperties = {
  width: '100%', background: DS.surfaceHover as string, color: DS.text as string,
  border: `1px solid ${DS.border}`, borderRadius: '10px',
  padding: '8px 10px', fontSize: '13px', outline: 'none',
};

export default function SponsorManager({ sponsors: initial, allLearners }: Props) {
  const [sponsors,   setSponsors]   = useState(initial);
  const [loading,    setLoading]    = useState<string | null>(null);

  const [showNew,    setShowNew]    = useState(false);
  const [newName,    setNewName]    = useState('');
  const [newContact, setNewContact] = useState('');
  const [newEmail,   setNewEmail]   = useState('');

  const [loginModal, setLoginModal] = useState<{ sponsorId: string; sponsorName: string } | null>(null);
  const [loginName,  setLoginName]  = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass,  setLoginPass]  = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [loginDone,  setLoginDone]  = useState<string | null>(null);

  const [linkModal,  setLinkModal]  = useState<{ sponsorId: string; sponsorName: string } | null>(null);
  const [search,     setSearch]     = useState('');
  const [justLinked, setJustLinked] = useState<Record<string, string[]>>({});

  const createSponsor = async () => {
    if (!newName.trim()) { toast.error('Enter sponsor name'); return; }
    setLoading('new');
    try {
      const res  = await fetch('/api/v1/sponsors', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sponsor_name: newName.trim(), contact_name: newContact, contact_email: newEmail }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSponsors(prev => [...prev, { ...json.data, learner_count: 0, users: [] }]);
      setNewName(''); setNewContact(''); setNewEmail(''); setShowNew(false);
      toast.success(`${newName} added`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'An error occurred'); }
    finally { setLoading(null); }
  };

  const createLogin = async () => {
    if (!loginModal) return;
    if (!loginName.trim())    { toast.error('Enter full name');   return; }
    if (!loginEmail.trim())   { toast.error('Enter email');       return; }
    if (loginPass.length < 8) { toast.error('Password must be at least 8 characters'); return; }

    setLoading('login');
    try {
      const res  = await fetch(`/api/v1/sponsors/${loginModal.sponsorId}/users`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: loginName.trim(), email: loginEmail.trim(), password: loginPass }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create login');
      setLoginDone(loginEmail.trim());
      setSponsors(prev => prev.map(s =>
        s.sponsor_id === loginModal.sponsorId
          ? { ...s, users: [...s.users, { user_id: json.data?.user_id ?? '', full_name: loginName, email: loginEmail, role: 'sponsor' }] }
          : s
      ));
    } catch (e) { toast.error(e instanceof Error ? e.message : 'An error occurred'); }
    finally { setLoading(null); }
  };

  const closeLoginModal = () => {
    setLoginModal(null);
    setLoginName(''); setLoginEmail(''); setLoginPass('');
    setShowPass(false); setLoginDone(null);
  };

  const linkLearner = async (learnerId: string) => {
    if (!linkModal) return;
    setLoading(`link-${learnerId}`);
    try {
      const res = await fetch(`/api/v1/sponsors/${linkModal.sponsorId}/learners`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learner_id: learnerId }),
      });
      if (!res.ok) throw new Error('Failed to link');
      setJustLinked(prev => ({
        ...prev,
        [linkModal.sponsorId]: [...(prev[linkModal.sponsorId] || []), learnerId],
      }));
      setSponsors(prev => prev.map(s =>
        s.sponsor_id === linkModal.sponsorId ? { ...s, learner_count: s.learner_count + 1 } : s
      ));
      toast.success('Learner linked');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'An error occurred'); }
    finally { setLoading(null); }
  };

  const unlinkLearner = async (learnerId: string) => {
    if (!linkModal) return;
    setLoading(`unlink-${learnerId}`);
    try {
      const res = await fetch(`/api/v1/sponsors/${linkModal.sponsorId}/learners/${learnerId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setJustLinked(prev => ({
        ...prev,
        [linkModal.sponsorId]: (prev[linkModal.sponsorId] || []).filter(id => id !== learnerId),
      }));
      setSponsors(prev => prev.map(s =>
        s.sponsor_id === linkModal.sponsorId ? { ...s, learner_count: Math.max(0, s.learner_count - 1) } : s
      ));
      toast.success('Learner unlinked');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'An error occurred'); }
    finally { setLoading(null); }
  };

  const filteredLearners = allLearners.filter(l =>
    !search ||
    l.full_name.toLowerCase().includes(search.toLowerCase()) ||
    l.learner_code.toLowerCase().includes(search.toLowerCase()) ||
    l.school_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">

      {/* Add sponsor button */}
      <div className="flex justify-end">
        <button onClick={() => setShowNew(p => !p)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Sponsor
        </button>
      </div>

      {showNew && (
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: DS.primaryLight, border: `1px solid ${DS.primaryBorder}` }}>
          <h3 className="text-sm font-semibold" style={{ color: DS.primary }}>New Sponsor Organisation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label style={labelSt}>Organisation Name <span style={{ color: 'var(--ds-danger)' }}>*</span></label>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                style={inputSt} placeholder="e.g. Honeywell" />
            </div>
            <div>
              <label style={labelSt}>Contact Person</label>
              <input value={newContact} onChange={e => setNewContact(e.target.value)}
                style={inputSt} placeholder="Full name" />
            </div>
            <div>
              <label style={labelSt}>Contact Email</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                style={inputSt} placeholder="contact@sponsor.com" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={createSponsor} disabled={loading === 'new'} className="btn-primary text-sm">
              {loading === 'new' && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Sponsor
            </button>
            <button onClick={() => setShowNew(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Sponsor cards */}
      {sponsors.length === 0 ? (
        <div className="text-center py-20 rounded-2xl" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
          <Award className="w-12 h-12 mx-auto mb-3" style={{ color: DS.borderLight }} />
          <p className="text-sm" style={{ color: DS.textMuted }}>No sponsors yet. Click "Add Sponsor" above.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sponsors.map(sponsor => {
            const pal = sponsorColor(sponsor.sponsor_name);
            return (
              <div key={sponsor.sponsor_id}
                className="rounded-2xl overflow-hidden flex flex-col"
                style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>

                {/* Coloured header */}
                <div className="px-5 py-4 flex items-center gap-3"
                  style={{ background: pal.bg, borderBottom: `2px solid ${pal.border}` }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0"
                    style={{ background: pal.solid }}>
                    {sponsor.sponsor_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate" style={{ color: DS.text }}>{sponsor.sponsor_name}</h3>
                    <p className="text-xs mt-0.5 font-semibold" style={{ color: pal.text }}>
                      {sponsor.learner_count} learner{sponsor.learner_count !== 1 ? 's' : ''} sponsored
                    </p>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 flex-1 flex flex-col gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: DS.textMuted }}>
                      Portal Logins
                    </p>
                    {sponsor.users?.length > 0 ? (
                      <div className="space-y-2">
                        {sponsor.users.map((u, i) => (
                          <div key={u.user_id || i}
                            className="flex items-center gap-2 rounded-xl px-3 py-2"
                            style={{ background: DS.surfaceHover }}>
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                              style={{ background: DS.primary }}>
                              {u.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate" style={{ color: DS.text }}>{u.full_name}</p>
                              <p className="text-xs truncate" style={{ color: DS.textMuted }}>{u.email}</p>
                            </div>
                            <span className="text-[10px] font-semibold shrink-0 px-1.5 py-0.5 rounded-full"
                              style={{ background: DS.primaryLight, color: DS.primary }}>
                              active
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs rounded-xl px-3 py-2" style={{ color: DS.textMuted, background: DS.surfaceHover }}>
                        No login accounts yet
                      </p>
                    )}
                  </div>

                  <div className="mt-auto space-y-2">
                    <button
                      onClick={() => setLoginModal({ sponsorId: sponsor.sponsor_id, sponsorName: sponsor.sponsor_name })}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer"
                      style={{ background: pal.solid }}>
                      <Key className="w-4 h-4" />
                      Create Sponsor Login
                    </button>
                    <button
                      onClick={() => { setLinkModal({ sponsorId: sponsor.sponsor_id, sponsorName: sponsor.sponsor_name }); setSearch(''); }}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium border-2 transition-all cursor-pointer"
                      style={{ borderColor: pal.border, color: pal.text, background: pal.bg }}>
                      <Users className="w-4 h-4" />
                      Link / Manage Learners
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE LOGIN MODAL ── */}
      {loginModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl shadow-2xl w-full max-w-md" style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>

            {loginDone ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'var(--ds-success-light)' }}>
                  <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--ds-success)' }} />
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: DS.text }}>Login Created!</h3>
                <p className="text-sm mb-1" style={{ color: DS.textMuted }}>
                  <strong style={{ color: DS.text }}>{loginName}</strong> can now sign in to the{' '}
                  <strong style={{ color: DS.text }}>{loginModal.sponsorName}</strong> sponsor portal.
                </p>
                <div className="rounded-xl p-4 mt-4 text-left space-y-2 text-sm"
                  style={{ background: DS.surfaceHover }}>
                  <p style={{ color: DS.textMuted }}>Email: <span className="font-mono" style={{ color: DS.text }}>{loginDone}</span></p>
                  <p style={{ color: DS.textMuted }}>Password: <span className="font-mono" style={{ color: DS.text }}>{loginPass}</span></p>
                </div>
                <p className="text-xs mt-3" style={{ color: DS.textMuted }}>
                  Share these credentials with the sponsor. They will see only {loginModal.sponsorName}'s learners.
                </p>
                <button onClick={closeLoginModal} className="btn-primary mt-5 w-full justify-center">
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${DS.border}` }}>
                  <div>
                    <h3 className="font-bold text-lg" style={{ color: DS.text }}>Create Sponsor Login</h3>
                    <p className="text-sm mt-0.5" style={{ color: DS.textMuted }}>
                      For <strong style={{ color: DS.text }}>{loginModal.sponsorName}</strong> — they will only see their own learners
                    </p>
                  </div>
                  <button aria-label="Close" onClick={closeLoginModal} className="p-2 rounded-xl transition-colors cursor-pointer"
                    style={{ color: DS.textMuted }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <label style={labelSt}>Full Name <span style={{ color: 'var(--ds-danger)' }}>*</span></label>
                    <input value={loginName} onChange={e => setLoginName(e.target.value)}
                      style={inputSt} placeholder="e.g. Sarah Johnson" autoFocus />
                  </div>
                  <div>
                    <label style={labelSt}>Email Address <span style={{ color: 'var(--ds-danger)' }}>*</span></label>
                    <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                      style={inputSt} placeholder="sarah@honeywell.com" />
                  </div>
                  <div>
                    <label style={labelSt}>Password <span style={{ color: 'var(--ds-danger)' }}>*</span></label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={loginPass} onChange={e => setLoginPass(e.target.value)}
                        style={{ ...inputSt, paddingRight: '40px' }} placeholder="Min 8 characters" />
                      <button type="button" aria-label={showPass ? 'Hide password' : 'Show password'} onClick={() => setShowPass(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                        style={{ color: DS.textMuted }}>
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {loginPass.length > 0 && loginPass.length < 8 && (
                      <p className="text-xs mt-1" style={{ color: 'var(--ds-danger)' }}>At least 8 characters required</p>
                    )}
                  </div>

                  <div className="rounded-xl p-3 text-xs" style={{ background: DS.primaryLight, color: DS.primary }}>
                    <strong>What this person will see:</strong> Only the learners sponsored by {loginModal.sponsorName} —
                    their attendance, scores, projects and risk status. No other data.
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={closeLoginModal} className="btn-secondary flex-1">Cancel</button>
                    <button onClick={createLogin} disabled={loading === 'login'} className="btn-primary flex-1 justify-center">
                      {loading === 'login' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                      {loading === 'login' ? 'Creating…' : 'Create Login'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── LINK LEARNERS MODAL ── */}
      {linkModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]"
            style={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${DS.border}` }}>
              <div>
                <h3 className="font-bold" style={{ color: DS.text }}>Link Learners</h3>
                <p className="text-sm mt-0.5" style={{ color: DS.textMuted }}>
                  Assign learners sponsored by <strong style={{ color: DS.text }}>{linkModal.sponsorName}</strong>
                </p>
              </div>
              <button aria-label="Close" onClick={() => setLinkModal(null)} className="p-2 rounded-xl cursor-pointer"
                style={{ color: DS.textMuted }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4" style={{ borderBottom: `1px solid ${DS.border}` }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, code or school…"
                className="form-input w-full" />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredLearners.length === 0 ? (
                <p className="text-center py-8 text-sm" style={{ color: DS.textMuted }}>No learners found</p>
              ) : filteredLearners.map(l => {
                const isLinked = (justLinked[linkModal.sponsorId] || []).includes(l.learner_id);
                return (
                  <div key={l.learner_id}
                    className="flex items-center justify-between p-3 rounded-xl transition-all"
                    style={isLinked
                      ? { background: 'var(--ds-success-light)', border: '1px solid var(--ds-success)' }
                      : { background: DS.surfaceHover as string, border: `1px solid ${DS.border}` }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: DS.text }}>{l.full_name}</p>
                      <p className="text-xs" style={{ color: DS.textMuted }}>{l.learner_code} · {l.school_name}</p>
                    </div>
                    {isLinked ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold" style={{ color: 'var(--ds-success)' }}>✓ Linked</span>
                        <button
                          onClick={() => unlinkLearner(l.learner_id)}
                          disabled={!!loading}
                          className="text-xs px-2 py-1 rounded-xl transition-colors cursor-pointer"
                          style={{ border: '1px solid var(--ds-danger)', color: 'var(--ds-danger)', background: 'var(--ds-danger-light)' }}>
                          {loading === `unlink-${l.learner_id}` ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Remove'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => linkLearner(l.learner_id)}
                        disabled={!!loading}
                        className="text-xs font-medium px-3 py-1 rounded-xl transition-colors cursor-pointer"
                        style={{ border: `1px solid ${DS.primaryBorder}`, color: DS.primary, background: DS.primaryLight }}>
                        {loading === `link-${l.learner_id}` ? <Loader2 className="w-3 h-3 animate-spin inline" /> : '+ Link'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4" style={{ borderTop: `1px solid ${DS.border}` }}>
              <button onClick={() => setLinkModal(null)} className="btn-primary w-full justify-center">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
