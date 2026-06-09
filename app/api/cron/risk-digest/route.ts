export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { emailRiskDigest } from '@/lib/email';

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  // Fetch all at-risk learners with school info
  const { data: riskRows, error: riskErr } = await supabase
    .from('risk_scores')
    .select(`
      risk_level,
      learners!inner(schools(school_name))
    `)
    .in('risk_level', ['high', 'medium']);

  if (riskErr) {
    console.error('[risk-digest] fetch error:', riskErr.message);
    return NextResponse.json({ error: riskErr.message }, { status: 500 });
  }

  // Fetch admin emails + ids
  const { data: admins, error: adminErr } = await supabase
    .from('users')
    .select('user_id, email')
    .eq('role', 'admin');

  if (adminErr || !admins?.length) {
    console.warn('[risk-digest] no admins found — skipping email');
    return NextResponse.json({ ok: true, sent: 0 });
  }

  interface RiskRow { risk_level: string; learners: { schools: { school_name: string } | null } | null }
  const rows = (riskRows ?? []) as unknown as RiskRow[];
  const high   = rows.filter(r => r.risk_level === 'high').length;
  const medium = rows.filter(r => r.risk_level === 'medium').length;

  // School breakdown
  const schoolMap: Record<string, { school: string; high: number; medium: number }> = {};
  for (const r of rows) {
    const name = r.learners?.schools?.school_name ?? 'Unknown';
    if (!schoolMap[name]) schoolMap[name] = { school: name, high: 0, medium: 0 };
    schoolMap[name][r.risk_level as 'high' | 'medium']++;
  }

  await emailRiskDigest({
    adminEmails:  (admins).map(a => a.email),
    adminUserIds: (admins).map(a => a.user_id),
    high,
    medium,
    bySchool: Object.values(schoolMap),
    appUrl:   process.env.NEXT_PUBLIC_APP_URL ?? '',
  });

  console.info(`[risk-digest] sent to ${admins.length} admin(s) — ${high} high, ${medium} medium`);
  return NextResponse.json({ ok: true, sent: admins.length, high, medium });
}