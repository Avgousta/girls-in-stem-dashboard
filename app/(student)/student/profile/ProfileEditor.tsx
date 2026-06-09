'use client';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Loader2, Camera, Plus, X } from 'lucide-react';
import { useTheme } from '../../StudentThemeProvider';

interface Props {
  learnerId:   string;
  learnerCode: string;
  grade:       number;
  schoolName:  string;
  profile:     any;
}

const INTEREST_SUGGESTIONS = [
  '💻 Coding','🤖 Robotics','🧬 Biology','🔭 Astronomy','🎨 Design',
  '📐 Maths','🧪 Chemistry','⚡ Electronics','🎮 Gaming','📱 Apps',
  '🎵 Music','📸 Photography','✍️ Writing','🏃 Sport','♟️ Chess',
  '🌍 Environment','🩺 Medicine','✈️ Engineering','🎭 Drama','🌐 Languages',
];

const CAREER_SUGGESTIONS = [
  'Software Engineer','Data Scientist','Doctor','Architect',
  'Astronaut','AI Researcher','Teacher','Entrepreneur',
  'Game Developer','Cybersecurity Expert','Nurse','Journalist',
];

export default function ProfileEditor({ learnerId, learnerCode, grade, schoolName, profile }: Props) {
  const { theme, accentColor } = useTheme();
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef                   = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    bio:         profile?.bio        || '',
    aspiration:  profile?.aspiration || '',
    interests:   (profile?.interests || []) as string[],
    hobbies:     (profile?.hobbies   || []) as string[],
    avatar_url:  profile?.avatar_url || '',
    cover_color: profile?.cover_color || '#4F2D7F',
    phone:       profile?.phone      || '',
  });
  const [hobbyInput, setHobbyInput] = useState('');
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const toggleInterest = (tag: string) =>
    set('interests', form.interests.includes(tag)
      ? form.interests.filter((i: string) => i !== tag)
      : [...form.interests, tag]);

  const addHobby = () => {
    const h = hobbyInput.trim();
    if (h && !form.hobbies.includes(h)) { set('hobbies', [...form.hobbies, h]); setHobbyInput(''); }
  };

  const removeHobby = (h: string) =>
    set('hobbies', form.hobbies.filter((x: string) => x !== h));

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => { set('avatar_url', reader.result as string); setUploading(false); toast.success('Photo ready — tap Save to apply'); };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/v1/student/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Profile saved! 🎉');
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  };

  // All inputs: white bg, dark text — always readable regardless of theme
  const inputStyle: React.CSSProperties = {
    background: '#ffffff', color: '#111827', border: '1.5px solid #e5e7eb',
    borderRadius: 12, padding: '10px 14px', fontSize: 14,
    width: '100%', outline: 'none', lineHeight: 1.5,
  };

  // Section cards use the theme
  const sectionStyle: React.CSSProperties = {
    background: theme.cardBg, border: `1px solid ${theme.cardBorder}`,
    borderRadius: 20, padding: 16,
  };

  const labelStyle: React.CSSProperties = {
    color: theme.textPrimary, fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'block',
  };

  return (
    <div className="space-y-4 pb-4">

      {/* Avatar card */}
      <div className="rounded-3xl overflow-hidden"
        style={{ background: `linear-gradient(135deg,${accentColor}ee 0%,${accentColor}55 100%)`, minHeight: 150 }}>
        <div className="p-5 flex flex-col items-center gap-4">
          {/* Avatar upload */}
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.25)', border: '3px solid rgba(255,255,255,0.4)' }}>
              {form.avatar_url
                ? <img src={form.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white/60" />
                  </div>}
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}>
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="text-center">
            <p className="text-white font-black text-lg drop-shadow">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-white/75 text-sm">Grade {grade} · {schoolName}</p>
            <p className="text-white/50 text-xs font-mono mt-0.5">{learnerCode}</p>
          </div>
        </div>
      </div>

      {/* Bio */}
      <div style={sectionStyle}>
        <div className="flex items-center justify-between mb-3">
          <span style={labelStyle}>✍️ Your Bio</span>
          <span className="text-xs" style={{ color: theme.textMuted }}>{form.bio.length}/200</span>
        </div>
        <textarea value={form.bio} onChange={e => set('bio', e.target.value)}
          rows={3} maxLength={200}
          placeholder="Tell the world about yourself — what drives you, what are you proud of?"
          style={{ ...inputStyle, resize: 'none' }} />
      </div>

      {/* Career */}
      <div style={sectionStyle}>
        <span style={labelStyle}>🎯 I Want to Be...</span>
        <input value={form.aspiration} onChange={e => set('aspiration', e.target.value)}
          placeholder="e.g. Software Engineer, Doctor, Astronaut..."
          style={inputStyle} />
        <div className="flex flex-wrap gap-2 mt-3">
          {CAREER_SUGGESTIONS.map(c => (
            <button key={c} onClick={() => set('aspiration', c)}
              className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
              style={{
                background:  form.aspiration === c ? accentColor : '#ffffff',
                color:       form.aspiration === c ? '#ffffff'   : '#374151',
                border:      `1.5px solid ${form.aspiration === c ? accentColor : '#e5e7eb'}`,
              }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Interests */}
      <div style={sectionStyle}>
        <div className="flex items-center justify-between mb-3">
          <span style={labelStyle}>💡 Interests</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: `${accentColor}20`, color: accentColor }}>
            {form.interests.length} selected
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {INTEREST_SUGGESTIONS.map(tag => {
            const on = form.interests.includes(tag);
            return (
              <button key={tag} onClick={() => toggleInterest(tag)}
                className="text-xs px-3 py-2 rounded-full font-semibold transition-all"
                style={{
                  background: on ? accentColor  : '#ffffff',
                  color:      on ? '#ffffff'    : '#374151',
                  border:     `1.5px solid ${on ? accentColor : '#e5e7eb'}`,
                  transform:  on ? 'scale(1.05)': 'scale(1)',
                }}>
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hobbies */}
      <div style={sectionStyle}>
        <span style={labelStyle}>🎨 Hobbies</span>
        <div className="flex gap-2 mb-3">
          <input value={hobbyInput} onChange={e => setHobbyInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addHobby()}
            placeholder="Type a hobby and press Enter or +"
            style={{ ...inputStyle, flex: 1 }} />
          <button onClick={addHobby}
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white"
            style={{ background: accentColor }}>
            <Plus className="w-5 h-5" />
          </button>
        </div>
        {form.hobbies.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {form.hobbies.map((h: string) => (
              <span key={h} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-semibold"
                style={{ background: '#ffffff', color: '#374151', border: '1.5px solid #e5e7eb' }}>
                {h}
                <button onClick={() => removeHobby(h)}
                  className="w-4 h-4 rounded-full flex items-center justify-center opacity-60 hover:opacity-100"
                  style={{ background: '#e5e7eb' }}>
                  <X className="w-2.5 h-2.5 text-gray-600" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-center py-2" style={{ color: theme.textMuted }}>
            Add your hobbies — sport, art, gaming, music…
          </p>
        )}
      </div>

      {/* Phone */}
      <div style={sectionStyle}>
        <span style={labelStyle}>📱 Phone Number</span>
        <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
          placeholder="082 000 0000" style={inputStyle} />
      </div>

      {/* Save */}
      <button onClick={handleSave} disabled={saving}
        className="w-full py-4 rounded-2xl text-white text-base font-black tracking-wide flex items-center justify-center gap-2 transition-all active:scale-98"
        style={{
          background: `linear-gradient(135deg,${accentColor} 0%,${theme.accentVar} 100%)`,
          boxShadow:  `0 8px 32px ${accentColor}50`,
          opacity:    saving ? 0.8 : 1,
        }}>
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : '✨'}
        {saving ? 'Saving…' : 'Save Profile'}
      </button>
    </div>
  );
}
