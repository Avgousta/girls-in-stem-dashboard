import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/',
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always build a response that can carry refreshed cookies
  const response = NextResponse.next({ request: { headers: request.headers } });

  const SUPA_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars missing, allow everything through (misconfiguration — don't block users)
  if (!SUPA_URL || !SUPA_ANON) return response;

  // Create client — this MUST run on every request to keep session cookies fresh
  const supabase = createServerClient(SUPA_URL, SUPA_ANON, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Use getSession() for middleware — reads from cookie, no extra network round-trip.
  // (getUser() makes a server-side JWT validation call which can fail under latency.)
  const { data: { session } } = await supabase.auth.getSession();

  const isPublic =
    PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/')) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/');

  // Unauthenticated on a protected route → redirect to login
  if (!session && !isPublic) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated — enforce role-based portal access
  if (session && !isPublic) {
    const { data: profile } = await supabase
      .from('users')
      .select('role, is_active')
      .eq('user_id', session.user.id)
      .single();

    if (profile && !profile.is_active) {
      return NextResponse.redirect(new URL('/login?error=pending_approval', request.url));
    }

    if (profile) {
      const role     = profile.role as string;
      const roleHome = ROLE_HOME[role] ?? '/dashboard';

      const wrongPortal =
        (role === 'learner'    && (pathname.startsWith('/dashboard') || pathname.startsWith('/teacher') || pathname.startsWith('/sponsor') || pathname.startsWith('/admin'))) ||
        (role === 'instructor' && (pathname.startsWith('/student')   || pathname.startsWith('/sponsor') || pathname.startsWith('/admin'))) ||
        (role === 'sponsor'    && (pathname.startsWith('/dashboard') || pathname.startsWith('/teacher') || pathname.startsWith('/student') || pathname.startsWith('/admin'))) ||
        (role === 'parent'     && (pathname.startsWith('/dashboard') || pathname.startsWith('/teacher') || pathname.startsWith('/student') || pathname.startsWith('/sponsor') || pathname.startsWith('/admin')));

      if (wrongPortal) {
        return NextResponse.redirect(new URL(roleHome, request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
