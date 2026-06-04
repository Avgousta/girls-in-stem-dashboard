export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cookies = request.cookies.getAll();
  const supabaseCookies = cookies.filter(c =>
    c.name.includes('supabase') || c.name.includes('sb-') || c.name.includes('auth')
  );

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Cookie Debug</title>
  <style>
    body { font-family: monospace; background: #0f0f15; color: #e2e8f0; padding: 32px; }
    h1 { color: #c4a8e8; }
    h2 { color: #818cf8; margin-top: 24px; }
    .cookie { background: #1a1a2e; border: 1px solid #2d1b5e; border-radius: 8px; padding: 12px 16px; margin: 8px 0; }
    .name { color: #6ee7b7; font-weight: bold; }
    .val  { color: #94a3b8; font-size: 11px; word-break: break-all; margin-top: 4px; }
    .none { color: #f87171; }
    .ok   { color: #6ee7b7; }
    .info { background: #1e3a5f; border: 1px solid #1d4ed8; border-radius: 8px; padding: 16px; margin: 16px 0; }
  </style>
</head>
<body>
  <h1>🍪 Cookie Debug</h1>

  <div class="info">
    <strong style="color:#7dd3fc">How to use this page:</strong><br><br>
    1. Open <a href="/login" style="color:#818cf8">/login</a> and sign in<br>
    2. After signing in, immediately open this page: <a href="/api/debug-cookies" style="color:#818cf8">/api/debug-cookies</a><br>
    3. If you see Supabase cookies below, the session IS being set but the proxy can't read it<br>
    4. If you see NO cookies, the login is not setting a session at all
  </div>

  <h2>All Supabase / Auth cookies (${supabaseCookies.length} found)</h2>
  ${supabaseCookies.length === 0
    ? '<p class="none">⚠ No Supabase cookies found — you are not logged in, or login did not set a cookie</p>'
    : supabaseCookies.map(c => `
      <div class="cookie">
        <div class="name">${c.name}</div>
        <div class="val">${c.value.slice(0, 120)}${c.value.length > 120 ? '...' : ''}</div>
      </div>`).join('')
  }

  <h2>All cookies on this request (${cookies.length} total)</h2>
  ${cookies.length === 0
    ? '<p class="none">No cookies at all — browser may be blocking cookies</p>'
    : cookies.map(c => `
      <div class="cookie">
        <div class="name">${c.name}</div>
        <div class="val">${c.value.slice(0, 80)}${c.value.length > 80 ? '...' : ''}</div>
      </div>`).join('')
  }

  <div class="info" style="margin-top:24px">
    <strong style="color:#7dd3fc">What to do with this info:</strong><br><br>
    • <strong>Supabase cookies present</strong> → paste the cookie names here (in chat) so we can check the proxy cookie reading logic<br>
    • <strong>No cookies at all</strong> → your browser is blocking cookies. Try Chrome, disable any cookie-blocking extensions, or check that localhost is not blocked<br>
    • <strong>This page redirects to /login</strong> → the proxy is blocking the /api/debug-cookies route — we need to add it to PUBLIC_PATHS
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}