// Design tokens backed by CSS custom properties — theme-aware.
// The CSS vars are defined in app/globals.css for dark (default) and
// [data-theme="light"]. Components reference DS.* as inline style values
// and they automatically respond to theme changes.

export const DS = {
  bg:            'var(--ds-bg)',
  bg2:           'var(--ds-bg2)',
  sidebar:       'var(--ds-sidebar)',
  surface:       'var(--ds-surface)',
  surfaceHover:  'var(--ds-surface-hover)',
  border:        'var(--ds-border)',
  borderLight:   'var(--ds-border-light)',
  primary:       '#7C3AED',                  // violet — works on both themes
  primaryLight:  'var(--ds-primary-light)',
  primaryBorder: 'var(--ds-primary-border)',
  text:          'var(--ds-text)',
  textMid:       'var(--ds-text-mid)',
  textMuted:     'var(--ds-text-muted)',
  danger:        'var(--ds-danger)',
  dangerLight:   'var(--ds-danger-light)',
  warn:          'var(--ds-warn)',
  warnLight:     'var(--ds-warn-light)',
  success:       'var(--ds-success)',
  successLight:  'var(--ds-success-light)',
  purple:        'var(--ds-purple)',
  purpleLight:   'var(--ds-purple-light)',
} as const;
