import { NextResponse, type NextRequest } from 'next/server';

// Next.js 16 proxy — minimal version
// Auth is handled by requireAuth() in each server component/layout
// The proxy only redirects the root path and passes everything else through

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect bare root to dashboard
  // The dashboard layout's requireAuth() will redirect to /login if not signed in
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],   // Only run on root path
};
