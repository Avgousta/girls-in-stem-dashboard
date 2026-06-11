export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Runs on the 1st of Jan, Apr, Jul, Oct — generates and emails quarterly reports
// for all active sponsors with at least one linked learner.

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? '';

  // Compute last quarter's date range
  const now       = new Date();
  const qStart    = new Date(now.getFullYear(), Math.floor((now.getMonth()) / 3) * 3 - 3, 1);
  const qEnd      = new Date(qStart.getFullYear(), qStart.getMonth() + 3, 0);
  const periodStart = qStart.toISOString().slice(0, 10);
  const periodEnd   = qEnd.toISOString().slice(0, 10);

  // Fetch all active sponsors with linked learners
  const { data: sponsors } = await supabase
    .from('sponsors')
    .select('sponsor_id, sponsor_name, contact_email')
    .eq('is_active', true);

  if (!sponsors?.length) {
    return NextResponse.json({ ok: true, generated: 0 });
  }

  let generated = 0;
  for (const sponsor of sponsors as { sponsor_id: string; sponsor_name: string; contact_email: string }[]) {
    try {
      const res = await fetch(`${appUrl}/api/v1/sponsors/${sponsor.sponsor_id}/reports`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          // Use internal service call — pass a special header to skip auth
          'x-cron-key':    process.env.CRON_SECRET ?? '',
        },
        body: JSON.stringify({
          period_start: periodStart,
          period_end:   periodEnd,
          report_type:  'quarterly',
          send_email:   !!sponsor.contact_email,
        }),
      });
      if (res.ok) generated++;
    } catch {
      console.error(`[sponsor-reports] failed for ${sponsor.sponsor_id}`);
    }
  }

  console.info(`[sponsor-reports] generated ${generated} quarterly reports for ${periodStart}–${periodEnd}`);
  return NextResponse.json({ ok: true, generated, period_start: periodStart, period_end: periodEnd });
}
