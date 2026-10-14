export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.toUpperCase();
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('learners')
    .select('user_id')
    .eq('learner_code', code)
    .single();

  if (!data) return NextResponse.json({ found: false });

  // Deliberately no name here: this endpoint is public and codes are sequential.
  return NextResponse.json({
    found:              true,
    already_registered: !!data.user_id,
  });
}
