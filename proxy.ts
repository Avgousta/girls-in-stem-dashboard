import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
];

const ROLE_HOME: Record<string, string> = {
  admin:      '/dashboard',
  instructor: '/teacher',
  learner:    '/student',
  sponsor:    '/sponsor',
  parent:     '/parent',
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Landing page is public — serve it directly.
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Allow public paths and static assets through without auth checks.
  if (
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
        remove: (name: string, options: any) => {
          request.cookies.set({ name, value: '', ...options });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile) return response;

  if (!profile.is_active) {
    return NextResponse.redirect(new URL('/login?error=pending_approval', request.url));
  }

  const role     = profile.role as string;
  const roleHome = ROLE_HOME[role] ?? '/dashboard';

  // Block users who hit the wrong portal and send them home.
  const wrongPortal =
    (role === 'learner'    && (pathname.startsWith('/dashboard') || pathname.startsWith('/teacher') || pathname.startsWith('/sponsor') || pathname.startsWith('/admin'))) ||
    (role === 'instructor' && (pathname.startsWith('/student')   || pathname.startsWith('/sponsor') || pathname.startsWith('/admin')))   ||
    (role === 'sponsor'    && (pathname.startsWith('/dashboard') || pathname.startsWith('/teacher') || pathname.startsWith('/student') || pathname.startsWith('/admin'))) ||
    (role === 'parent'     && (pathname.startsWith('/dashboard') || pathname.startsWith('/teacher') || pathname.startsWith('/student') || pathname.startsWith('/sponsor') || pathname.startsWith('/admin')));

  if (wrongPortal) {
    return NextResponse.redirect(new URL(roleHome, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
