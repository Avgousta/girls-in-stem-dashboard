'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Users, UserPlus, Loader2, Award, X, Key, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/utils';

interface Sponsor { sponsor_id: string; sponsor_name: string; learner_count: number; users: any[] }
interface Learner  { learner_id: string; learner_code: string; full_name: string; school_name: string }
interface Props    { sponsors: Sponsor[]; allLearners: Learner[]; sponsorUsers: any[] }

function sponsorColor(name: string) {
  const palettes = [
    { bg: '#EDE9FE', text: '#5B21B6', border: '#C4B5FD', solid: '#7C3AED' },
    { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD', solid: '#2563EB' },
    { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC', solid: '#16A34A' },
    { bg: '#FEF9C3', text: '#854D0E', border: '#FDE047', solid: '#CA8A04' },
    { bg: '#FCE7F3', text: '#9D174D', border: '#F9A8D4', solid: '#DB2777' },
    { bg: '#FFEDD5', text: '#9A3412', border: '#FED7AA', solid: '#EA580C' },
  ];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % palettes.length;
  return palettes[Math.abs(h) % palettes.length];
}

export default function SponsorManager({ sponsors: initial, allLearners }: Props) {
  const [sponsors,   setSponsors]   = useState(initial);
  const [loading,    setLoading]    = useState<string | null>(null);

  // New sponsor form
  const [showNew,    setShowNew]    = useState(false);
  const [newName,    setNewName]    = useState('');
  const [newContact, setNewContact] = useState('');
  const [newEmail,   setNewEmail]   = useState('');

  // Create login modal state
  const [loginModal, setLoginModal] = useState<{ sponsorId: string; sponsorName: string } | null>(null);
  const [loginName,  setLoginName]  = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass,  setLoginPass]  = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [loginDone,  setLoginDone]  = useState<string | null>(null); // success email

  // Link learners modal
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
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(null); }
  };

  const createLogin = async () => {
    if (!loginModal) return;
    if (!loginName.trim())  { toast.error('Enter full name');   return; }
    if (!loginEmail.trim()) { toast.error('Enter email');       return; }
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
      // Update sponsor card to show new user
      setSponsors(prev => prev.map(s =>
        s.sponsor_id === loginModal.sponsorId
          ? { ...s, users: [...s.users, { full_name: loginName, email: loginEmail }] }
          : s
      ));
    } catch (e: any) { toast.error(e.message); }
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
        s.sponsor_id === linkModal.sponsorId
          ? { ...s, learner_count: s.learner_count + 1 }
          : s
      ));
      toast.success('Learner linked');
    } catch (e: any) { toast.error(e.message); }
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
        s.sponsor_id === linkModal.sponsorId
          ? { ...s, learner_count: Math.max(0, s.learner_count - 1) }
          : s
      ));
      toast.success('Learner unlinked');
    } catch (e: any) { toast.error(e.message); }
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

      {/* Add sponsor */}
      <div className="flex justify-end">
        <button onClick={() => setShowNew(p => !p)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Sponsor
        </button>
      </div>

      {showNew && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-brand-800">New Sponsor Organisation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label">Organisation Name <span className="text-red-500">*</span></label>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                className="form-input" placeholder="e.g. Honeywell" />
            </div>
            <div>
              <label className="form-label">Contact Person</label>
              <input value={newContact} onChange={e => setNewContact(e.target.value)}
                className="form-input" placeholder="Full name" />
            </div>
            <div>
              <label className="form-label">Contact Email</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                className="form-input" placeholder="contact@sponsor.com" />
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
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
          <Award className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No sponsors yet. Click "Add Sponsor" above.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sponsors.map(sponsor => {
            const pal = sponsorColor(sponsor.sponsor_name);
            return (
              <div key={sponsor.sponsor_id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">

                {/* Coloured header */}
                <div className="px-5 py-4 flex items-center gap-3"
                  style={{ background: pal.bg, borderBottom: `2px solid ${pal.border}` }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0"
                    style={{ background: pal.solid }}>
                    {sponsor.sponsor_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{sponsor.sponsor_name}</h3>
                    <p className="text-xs mt-0.5" style={{ color: pal.text }}>
                      {sponsor.learner_count} learner{sponsor.learner_count !== 1 ? 's' : ''} sponsored
                    </p>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 flex-1 flex flex-col gap-4">

                  {/* Existing logins */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Portal Logins
                    </p>
                    {sponsor.users?.length > 0 ? (
                      <div className="space-y-2">
                        {sponsor.users.map((u: any, i: number) => (
                          <div key={u.user_id || i}
                            className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                            <div className="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {u.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-700 truncate">{u.full_name}</p>
                              <p className="text-xs text-gray-400 truncate">{u.email}</p>
                            </div>
                            <span className="text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded-full font-semibold shrink-0">
                              active
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                        No login accounts yet
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="mt-auto space-y-2">
                    {/* CREATE LOGIN — most prominent */}
                    <button
                      onClick={() => setLoginModal({ sponsorId: sponsor.sponsor_id, sponsorName: sponsor.sponsor_name })}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 shadow-sm"
                      style={{ background: pal.solid }}>
                      <Key className="w-4 h-4" />
                      Create Sponsor Login
                    </button>

                    {/* Link learners */}
                    <button
                      onClick={() => { setLinkModal({ sponsorId: sponsor.sponsor_id, sponsorName: sponsor.sponsor_name }); setSearch(''); }}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium border-2 transition-all"
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

      {/* ── CREATE LOGIN MODAL ─────────────────────────────────────────── */}
      {loginModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

            {loginDone ? (
              /* Success state */
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-mint-400/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-mint-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Login Created!</h3>
                <p className="text-gray-500 text-sm mb-1">
                  <strong>{loginName}</strong> can now sign in to the <strong>{loginModal.sponsorName}</strong> sponsor portal.
                </p>
                <div className="bg-gray-50 rounded-xl p-4 mt-4 text-left space-y-2 text-sm">
                  <p><span className="text-gray-400">URL:</span> <span className="font-mono text-brand-700">http://localhost:3000/login</span></p>
                  <p><span className="text-gray-400">Email:</span> <span className="font-mono">{loginDone}</span></p>
                  <p><span className="text-gray-400">Password:</span> <span className="font-mono">{loginPass}</span></p>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Share these credentials with the sponsor. They will see only {loginModal.sponsorName}'s learners.
                </p>
                <button onClick={closeLoginModal} className="btn-primary mt-5 w-full justify-center">
                  Done
                </button>
              </div>
            ) : (
              /* Form state */
              <>
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Create Sponsor Login</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      For <strong>{loginModal.sponsorName}</strong> — they will only see their own learners
                    </p>
                  </div>
                  <button onClick={closeLoginModal} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <label className="form-label">Full Name <span className="text-red-500">*</span></label>
                    <input value={loginName} onChange={e => setLoginName(e.target.value)}
                      className="form-input" placeholder="e.g. Sarah Johnson" autoFocus />
                  </div>
                  <div>
                    <label className="form-label">Email Address <span className="text-red-500">*</span></label>
                    <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                      className="form-input" placeholder="sarah@honeywell.com" />
                  </div>
                  <div>
                    <label className="form-label">Password <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={loginPass} onChange={e => setLoginPass(e.target.value)}
                        className="form-input pr-10" placeholder="Min 8 characters" />
                      <button type="button" onClick={() => setShowPass(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {loginPass.length > 0 && loginPass.length < 8 && (
                      <p className="text-xs text-red-500 mt-1">At least 8 characters required</p>
                    )}
                  </div>

                  <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 text-xs text-brand-700">
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

      {/* ── LINK LEARNERS MODAL ────────────────────────────────────────── */}
      {linkModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">Link Learners</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Assign learners sponsored by <strong>{linkModal.sponsorName}</strong>
                </p>
              </div>
              <button onClick={() => setLinkModal(null)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-100">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, code or school…"
                className="form-input" />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredLearners.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">No learners found</p>
              ) : filteredLearners.map(l => {
                const isLinked = (justLinked[linkModal.sponsorId] || []).includes(l.learner_id);
                return (
                  <div key={l.learner_id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-xl border transition-all',
                      isLinked ? 'bg-mint-50 border-mint-300' : 'border-gray-100 hover:border-brand-200'
                    )}>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{l.full_name}</p>
                      <p className="text-xs text-gray-400">{l.learner_code} · {l.school_name}</p>
                    </div>
                    {isLinked ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-mint-600 font-semibold">✓ Linked</span>
                        <button
                          onClick={() => unlinkLearner(l.learner_id)}
                          disabled={!!loading}
                          className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                          {loading === `unlink-${l.learner_id}` ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Remove'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => linkLearner(l.learner_id)}
                        disabled={!!loading}
                        className="text-xs text-brand-700 border border-brand-200 px-3 py-1 rounded-lg hover:bg-brand-50 transition-colors font-medium">
                        {loading === `link-${l.learner_id}` ? <Loader2 className="w-3 h-3 animate-spin inline" /> : '+ Link'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-gray-100">
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
