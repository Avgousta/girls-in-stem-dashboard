export const dynamic = 'force-dynamic';

import { requireApiAuth, ok, err } from '@/app/api/helpers';

export async function POST() {
  const { supabase, denied } = await requireApiAuth(['admin', 'instructor']);
  if (denied) return denied;

  const { error } = await supabase.rpc('calculate_risk_scores');
  if (error) return err(error.message, 500);

  const { count } = await supabase
    .from('risk_scores')
    .select('*', { count: 'exact', head: true });

  return ok({ recalculated: count || 0, timestamp: new Date().toISOString() });
}