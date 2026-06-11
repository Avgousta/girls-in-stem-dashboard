export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Params { params: Promise<{ code: string }> }

// Public endpoint — no auth required
export async function GET(_: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { code } = await params;

  const { data, error } = await supabase
    .from('certificates')
    .select(`
      certificate_id, cert_type, issued_at, verification_code, notes,
      learners!inner(
        learner_code,
        learner_profiles(first_name, last_name),
        schools(school_name)
      ),
      programs(program_name),
      issued_by_user:users!issued_by(full_name)
    `)
    .eq('verification_code', code.toUpperCase())
    .single();

  if (error || !data) {
    return NextResponse.json({ valid: false, error: 'Certificate not found' }, { status: 404 });
  }

  return NextResponse.json({ valid: true, certificate: data });
}
