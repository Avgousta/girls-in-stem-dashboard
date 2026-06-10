'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { DS } from '@/components/platform/tokens';

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface Props {
  options:      ComboboxOption[];
  value:        string;
  onChange:     (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?:    boolean;
  error?:       boolean;
}

export default function DarkCombobox({
  options, value, onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  disabled = false,
  error = false,
}: Props) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const [pos,   setPos]   = useState({ top: 0, left: 0, width: 0 });
  const triggerRef        = useRef<HTMLDivElement>(null);
  const panelRef          = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  const filtered = query.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        o.sublabel?.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  const openDropdown = useCallback(() => {
    if (disabled || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    setOpen(true);
  }, [disabled]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (!triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  const triggerSt: React.CSSProperties = {
    background:    DS.surfaceHover as string,
    border:        `1px solid ${error ? 'var(--ds-danger)' : open ? DS.primary : DS.border}`,
    borderRadius:  '12px',
    padding:       '10px 14px',
    cursor:        disabled ? 'not-allowed' : 'pointer',
    display:       'flex',
    alignItems:    'center',
    justifyContent:'space-between',
    opacity:        disabled ? 0.6 : 1,
    transition:    'border-color 0.15s',
    width:         '100%',
  };

  const panel = open ? createPortal(
    <div ref={panelRef} style={{
      position:      'fixed',
      top:            pos.top,
      left:           pos.left,
      width:          pos.width,
      zIndex:         9999,
      background:    '#1a1330',
      border:        `1px solid ${DS.border}`,
      borderRadius:  '12px',
      boxShadow:     '0 8px 40px rgba(0,0,0,0.7)',
      maxHeight:     '300px',
      display:       'flex',
      flexDirection: 'column',
      overflow:      'hidden',
    }}>
      {/* Search box */}
      <div className="p-2 border-b" style={{ borderColor: DS.border }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: DS.textMuted }} />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full text-sm pl-8 pr-8 py-1.5 rounded-lg outline-none"
            style={{ background: 'rgba(255,255,255,0.08)', color: DS.text as string, border: `1px solid ${DS.border}` }}
          />
          {query && (
            <button aria-label="Clear search" onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
              style={{ color: DS.textMuted }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Options list */}
      <div className="overflow-y-auto" role="listbox">
        {filtered.length === 0 ? (
          <p className="text-sm text-center py-5" style={{ color: DS.textMuted }}>No results found</p>
        ) : filtered.map(o => (
          <div key={o.value} role="option" aria-selected={o.value === value}
            onClick={() => { onChange(o.value); setOpen(false); setQuery(''); }}
            className="px-4 py-2.5 cursor-pointer text-sm"
            style={{
              background: o.value === value ? DS.primaryLight as string : 'transparent',
              color:      o.value === value ? DS.primary as string : DS.text as string,
            }}
            onMouseOver={e => { if (o.value !== value) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseOut={e =>  { if (o.value !== value) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
            <span className="font-medium">{o.label}</span>
            {o.sublabel && (
              <span className="text-xs ml-1.5" style={{ color: DS.textMuted }}>— {o.sublabel}</span>
            )}
          </div>
        ))}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div ref={triggerRef}>
      <div style={triggerSt}
        role="combobox" aria-expanded={open} aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={open ? () => setOpen(false) : openDropdown}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') open ? setOpen(false) : openDropdown(); }}>
        <span className="text-sm truncate"
          style={{ color: selected ? DS.text as string : DS.textMuted as string }}>
          {selected ? (selected.sublabel ? `${selected.label} — ${selected.sublabel}` : selected.label) : placeholder}
        </span>
        {open
          ? <ChevronUp  className="w-4 h-4 shrink-0" style={{ color: DS.textMuted }} />
          : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: DS.textMuted }} />}
      </div>
      {panel}
    </div>
  );
}
