export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  const { data: all } = await supabase
    .from('users')
    .select('user_id, email, full_name, role, is_active, created_at')
    .eq('role', 'instructor')
    .order('created_at', { ascending: false });

  const html = `<!DOCTYPE html>
<html>
<head><title>Debug Pending</title>
<style>
  body{font-family:monospace;background:#0f0f15;color:#e2e8f0;padding:32px;}
  table{border-collapse:collapse;width:100%;margin-top:16px;}
  th,td{border:1px solid #333;padding:8px 12px;text-align:left;font-size:13px;}
  th{background:#1a1a2e;color:#818cf8;}
  .t{color:#6ee7b7;} .f{color:#f87171;}
  code{background:#1a1a2e;padding:6px 12px;border-radius:6px;display:block;margin-top:8px;color:#c4a8e8;}
  h2{color:#c4a8e8;}p{color:#9ca3af;margin-top:20px;}
</style></head>
<body>
<h2>All Instructor Users (${(all||[]).length} found)</h2>
<table>
<tr><th>Email</th><th>Full Name</th><th>is_active</th><th>Created</th></tr>
${(all||[]).map((u:any) => `<tr>
  <td>${u.email}</td><td>${u.full_name}</td>
  <td class="${u.is_active ? 't' : 'f'}">${u.is_active ? '✓ true (active)' : '✗ false (PENDING)'}</td>
  <td>${u.created_at?.slice(0,10)}</td>
</tr>`).join('')}
</table>
<p>If a teacher shows <span class="t">is_active = true</span> but was never approved,
a database trigger or default is overriding the registration code.
Fix it by running this SQL in Supabase SQL Editor:</p>
<code>UPDATE users SET is_active = false WHERE role = 'instructor' AND email = 'TEACHER_EMAIL_HERE';</code>
<p>Then refresh <a href="/admin/approvals" style="color:#818cf8">/admin/approvals</a> to see the Approve button.</p>
<p style="margin-top:32px;color:#555">Delete this debug endpoint when done: app/api/v1/debug-pending/route.ts</p>
</body></html>`;

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
}