export const dynamic = 'force-dynamic';

import { requireApiAuth } from '@/app/api/helpers';
import { leadsToCsv, type LeadRow } from '@/lib/connect';

// CSV export of the conference lead register (opens in Excel)
export async function GET() {
  const { supabase, denied } = await requireApiAuth(['admin']);
  if (denied) return denied;

  const { data, error } = await supabase
    .from('conference_leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return new Response(error.message, { status: 500 });

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(leadsToCsv((data ?? []) as LeadRow[]), {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="melisizwe-conference-leads-${stamp}.csv"`,
      'Cache-Control':       'no-store',
    },
  });
}
