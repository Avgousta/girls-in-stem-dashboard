export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.toUpperCase();
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('learners')
    .select('learner_id, user_id, learner_profiles(first_name, last_name)')
    .eq('learner_code', code)
    .single();

  if (!data) return NextResponse.json({ found: false });

  const p = (data as unknown as { learner_profiles: Record<string, unknown> }).learner_profiles;
  return NextResponse.json({
    found:              true,
    full_name:          p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : '',
    already_registered: !!data.user_id,
  });
}
