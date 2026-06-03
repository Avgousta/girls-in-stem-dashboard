'use client';
import { useTheme, THEMES } from '../../StudentThemeProvider';

const ACCENT_COLORS = [
  '#4F2D7F','#2D8CFF','#16A34A','#D97706','#DB2777',
  '#7C3AED','#DC2626','#0891B2','#9333EA','#059669',
];

const LABELS: Record<number,string> = { 1:'😕 Poor', 2:'😐 Fair', 3:'😊 Good', 4:'😄 Great', 5:'🤩 Amazing' };

export default function ThemePicker() {
  const { theme, setThemeId, accentColor, setAccentColor } = useTheme();

  return (
    <div className="rounded-3xl overflow-hidden"
      style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>

      {/* Header */}
      <div className="px-5 pt-5 pb-4"
        style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
        <p className="text-base font-black" style={{ color: theme.textPrimary }}>🎨 Appearance</p>
        <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
          Pick a theme and accent colour
        </p>
      </div>

      <div className="p-5 space-y-6">

        {/* Dark / Light toggle */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: theme.textMuted }}>Mode</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: '🌙 Dark',  isDark: true  },
              { label: '☀️ Light', isDark: false },
            ].map(({ label, isDark }) => {
              const active = theme.isDark === isDark;
              return (
                <button key={label}
                  onClick={() => {
                    const match = THEMES.find(t => t.isDark === isDark && t.id !== theme.id)
                      || THEMES.find(t => t.isDark === isDark);
                    if (match && !active) setThemeId(match.id);
                  }}
                  className="py-3 rounded-2xl text-sm font-bold transition-all"
                  style={{
                    background:  active ? `${accentColor}22` : 'transparent',
                    border:      `2px solid ${active ? accentColor : theme.cardBorder}`,
                    color:       active ? accentColor : theme.textMuted,
                  }}>
                  {label}
                  {active && <span className="ml-2 text-xs">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Theme grid */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: theme.textMuted }}>Theme</p>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map(t => {
              const active = theme.id === t.id;
              return (
                <button key={t.id} onClick={() => setThemeId(t.id)}
                  className="rounded-2xl overflow-hidden transition-all duration-200"
                  style={{
                    outline:   active ? `3px solid ${accentColor}` : '3px solid transparent',
                    outlineOffset: '2px',
                    transform: active ? 'scale(1.04)' : 'scale(1)',
                  }}>
                  {/* Mini preview */}
                  <div className="h-12 relative" style={{ background: t.bg }}>
                    <div className="absolute bottom-0 inset-x-0 h-3 rounded-b-none"
                      style={{ background: t.navBg }} />
                    <div className="absolute top-1.5 left-1.5 right-1.5 h-4 rounded-lg"
                      style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }} />
                    {active && (
                      <div className="absolute top-1 right-1 w-3 h-3 rounded-full"
                        style={{ background: accentColor, boxShadow: '0 0 0 2px white' }} />
                    )}
                  </div>
                  <div className="py-2" style={{ background: t.cardBg }}>
                    <p className="text-center text-xs font-bold" style={{ color: t.textPrimary }}>
                      {t.emoji} {t.name}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent colour */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: theme.textMuted }}>Accent Colour</p>
          <div className="flex flex-wrap gap-3">
            {ACCENT_COLORS.map(c => (
              <button key={c} onClick={() => setAccentColor(c)}
                className="w-9 h-9 rounded-xl transition-all duration-150 hover:scale-110"
                style={{
                  background: c,
                  transform:  accentColor === c ? 'scale(1.25)' : 'scale(1)',
                  boxShadow:  accentColor === c
                    ? `0 0 0 3px ${theme.isDark ? '#0d0d1a' : '#fff'}, 0 0 0 5px ${c}`
                    : 'none',
                }} />
            ))}
          </div>
        </div>

        {/* Live preview card */}
        <div className="rounded-2xl p-4 space-y-3"
          style={{ background: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                   border: `1px solid ${theme.cardBorder}` }}>
          <p className="text-xs font-bold uppercase tracking-widest"
            style={{ color: theme.textMuted }}>👁 Preview</p>
          <p className="text-base font-black" style={{ color: theme.textPrimary }}>
            Hello, this is your portal
          </p>
          <p className="text-sm" style={{ color: theme.textSecond }}>
            Body text looks like this — readable and clear.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 py-2.5 rounded-xl text-xs font-black text-white text-center"
              style={{ background: accentColor }}>
              Active Button
            </div>
            <div className="flex-1 py-2.5 rounded-xl text-xs font-bold text-center"
              style={{ background: theme.cardBg, border: `1.5px solid ${theme.cardBorder}`,
                       color: theme.textMuted }}>
              Secondary
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
