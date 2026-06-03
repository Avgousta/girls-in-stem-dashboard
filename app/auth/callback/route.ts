import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const ROLE_HOME: Record<string, string> = {
  admin:      '/dashboard',
  instructor: '/teacher',
  learner:    '/student',
  sponsor:    '/sponsor',
  parent:     '/parent',
};

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // If a specific `next` was requested, honour it; otherwise route by role.
      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('user_id', user.id)
          .single();
        const dest = ROLE_HOME[profile?.role ?? ''] ?? '/dashboard';
        return NextResponse.redirect(`${origin}${dest}`);
      }
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
