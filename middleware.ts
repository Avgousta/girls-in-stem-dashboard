import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// ─── Public paths — no auth required ─────────────────────────────────────────
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
];

// ─── Role → home redirect ─────────────────────────────────────────────────────
const ROLE_HOME: Record<string, string> = {
  admin:      '/dashboard',
  instructor: '/dashboard',
  learner:    '/student',
  sponsor:    '/sponsor',
  parent:     '/parent',
};

// ─── Allowlist: route prefixes each role may visit ───────────────────────────
// Admin has no restrictions — they can access all routes.
// Every other role is limited to their allowed prefixes.
const ROLE_ALLOWED: Record<string, string[]> = {
  instructor: [
    '/dashboard', '/teacher',
    '/learners',                   // learner profiles (read)
    '/interventions',
    '/mentorship',
    '/risk',
    '/assessments',
    '/attendance',
    '/programs',
    '/projects',
    '/reports',
    '/notifications',
  ],
  learner: ['/student', '/learner'],
  sponsor: ['/sponsor'],
  parent:  ['/parent'],
};

function isAllowed(role: string, pathname: string): boolean {
  if (role === 'admin') return true;                          // admins: no restrictions
  const allowed = ROLE_ALLOWED[role];
  if (!allowed) return false;                                 // unknown role: deny
  return allowed.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always build a mutable response so we can refresh session cookies
  const response = NextResponse.next({ request: { headers: request.headers } });

  const SUPA_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Missing env — don't block anyone (misconfiguration shouldn't lock users out)
  if (!SUPA_URL || !SUPA_ANON) return response;

  // Skip static assets and API routes
  // API routes protect themselves via requireApiAuth()
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/.test(pathname)
  ) {
    return response;
  }

  // Public path — allow through but still refresh session cookies
  const isPublic = PUBLIC_PATHS.some(
    p => pathname === p || pathname.startsWith(p + '/')
  );

  // Build Supabase client — must be per-request so expired tokens get refreshed
  const supabase = createServerClient(SUPA_URL, SUPA_ANON, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options } as any);
        response.cookies.set({ name, value, ...options } as any);
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options } as any);
        response.cookies.set({ name, value: '', ...options } as any);
      },
    },
  });

  // ── getUser() not getSession() ───────────────────────────────────────────
  // getSession() trusts the cookie without server verification and can be
  // spoofed. getUser() validates the JWT with Supabase on every request.
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  // Unauthenticated on a protected route → redirect to login
  if ((userError || !user) && !isPublic) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Public route — allow through (whether authenticated or not)
  if (isPublic) return response;

  // Authenticated — enforce role-based portal access
  const { data: profile } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('user_id', user!.id)
    .single();

  // No profile row → likely pending setup; kick to login with context
  if (!profile) {
    return NextResponse.redirect(new URL('/login?error=no_profile', request.url));
  }

  // Inactive account → send to pending approval page
  if (!profile.is_active) {
    return NextResponse.redirect(new URL('/login?error=pending_approval', request.url));
  }

  const role     = profile.role as string;
  const roleHome = ROLE_HOME[role] ?? '/dashboard';

  // Wrong portal → redirect to role home
  if (!isAllowed(role, pathname)) {
    return NextResponse.redirect(new URL(roleHome, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Match everything except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
