export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET() {
  const checks: Record<string, { ok: boolean; value?: string; message: string }> = {};

  // 1. Check env vars
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  checks['NEXT_PUBLIC_SUPABASE_URL'] = url
    ? { ok: true,  value: url, message: 'Set correctly' }
    : { ok: false, message: 'MISSING — add to .env.local' };

  checks['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = anon
    ? { ok: true,  value: anon.slice(0, 20) + '...', message: 'Set (showing first 20 chars)' }
    : { ok: false, message: 'MISSING — add to .env.local' };

  checks['SUPABASE_SERVICE_ROLE_KEY'] = svc
    ? { ok: true,  value: svc.slice(0, 20) + '...', message: 'Set (showing first 20 chars)' }
    : { ok: false, message: 'MISSING — add to .env.local (needed for admin operations)' };

  // 2. Try connecting to Supabase
  if (url && anon) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(url, anon);
      const { error } = await sb.from('users').select('count').limit(1);
      if (error) {
        checks['supabase_connection'] = {
          ok: false,
          message: `Connected but query failed: ${error.message}. Have you run the SQL migrations?`,
        };
      } else {
        checks['supabase_connection'] = { ok: true, message: 'Connected to Supabase successfully' };
      }
    } catch (e) {
      checks['supabase_connection'] = { ok: false, message: `Connection failed: ${e instanceof Error ? e.message : String(e)}` };
    }
  } else {
    checks['supabase_connection'] = { ok: false, message: 'Skipped — fix env vars first' };
  }

  const allOk = Object.values(checks).every(c => c.ok);

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Girls in STEM — Diagnostics</title>
  <style>
    body { font-family: Arial, sans-serif; background: #0f0f15; color: #e2e8f0; padding: 40px; }
    h1   { color: #c4a8e8; margin-bottom: 8px; }
    p    { color: #666; margin-bottom: 32px; font-size: 14px; }
    .card { background: #1a1a2e; border: 1px solid #2d1b5e; border-radius: 10px; padding: 20px; margin-bottom: 16px; }
    .label { font-size: 13px; font-family: monospace; color: #818cf8; margin-bottom: 6px; }
    .status { font-size: 14px; padding: 8px 14px; border-radius: 6px; display: inline-block; margin-bottom: 8px; }
    .ok  { background: #052e16; color: #6ee7b7; border: 1px solid #065f46; }
    .bad { background: #450a0a; color: #fca5a5; border: 1px solid #991b1b; }
    .val { font-size: 12px; font-family: monospace; color: #94a3b8; margin-top: 4px; }
    .summary { padding: 16px 20px; border-radius: 10px; margin-bottom: 32px; font-size: 15px; font-weight: bold; }
    .summary.ok  { background: #052e16; color: #6ee7b7; border: 1px solid #065f46; }
    .summary.bad { background: #450a0a; color: #fca5a5; border: 1px solid #991b1b; }
    .next { background: #1e3a5f; border: 1px solid #1d4ed8; border-radius: 10px; padding: 20px; }
    .next h2 { color: #7dd3fc; margin-bottom: 12px; }
    .next li { color: #93c5fd; font-size: 14px; margin-bottom: 8px; line-height: 1.6; }
    code { background: #0f172a; padding: 2px 8px; border-radius: 4px; font-family: monospace; color: #c4a8e8; font-size: 13px; }
  </style>
</head>
<body>
  <h1>✦ Girls in STEM — Diagnostics</h1>
  <p>This page checks whether your environment is configured correctly.</p>

  <div class="summary ${allOk ? 'ok' : 'bad'}">
    ${allOk ? '✅  All checks passed — your platform should work!' : '❌  Some checks failed — see below for fixes'}
  </div>

  ${Object.entries(checks).map(([key, check]) => `
    <div class="card">
      <div class="label">${key}</div>
      <div class="status ${check.ok ? 'ok' : 'bad'}">${check.ok ? '✓  OK' : '✗  FAIL'} — ${check.message}</div>
      ${check.value ? `<div class="val">Value: ${check.value}</div>` : ''}
    </div>
  `).join('')}

  ${!allOk ? `
  <div class="next">
    <h2>How to fix failing checks</h2>
    <ul>
      <li>Open your <code>girlsinstem</code> folder</li>
      <li>Find the file <code>.env.local</code> — if it does not exist, rename <code>.env.example</code> to <code>.env.local</code></li>
      <li>Open it in Notepad (Windows) or TextEdit (Mac)</li>
      <li>Go to Supabase → your project → <strong>Settings → API</strong></li>
      <li>Copy the <strong>Project URL</strong> and paste it as <code>NEXT_PUBLIC_SUPABASE_URL</code></li>
      <li>Copy the <strong>anon public</strong> key and paste it as <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
      <li>Copy the <strong>service_role</strong> key and paste it as <code>SUPABASE_SERVICE_ROLE_KEY</code></li>
      <li>Save the file, then <strong>stop and restart</strong> your server: press <code>Ctrl+C</code> then run <code>npm run dev</code> again</li>
      <li>Refresh this page to re-check</li>
    </ul>
  </div>
  ` : `
  <div class="next">
    <h2>Everything looks good!</h2>
    <ul>
      <li>Visit <a href="/login" style="color:#818cf8">http://localhost:3000/login</a> to sign in</li>
      <li>Use the admin email and password you created in Supabase → Authentication</li>
      <li>If login fails, make sure you also ran the SQL INSERT to add your user to the <code>users</code> table (Phase 3 Step 18 in the Setup Guide)</li>
    </ul>
  </div>
  `}

  <p style="margin-top:32px;font-size:12px;color:#333">
    Remove or restrict this page before going live: <code>app/api/diagnostics/route.ts</code>
  </p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
    status: allOk ? 200 : 500,
  });
}