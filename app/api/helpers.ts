import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { UserRole } from '@/types';

// ── Standard API response helpers ─────────────────────────────────────────────
export const ok   = <T>(data: T, status = 200) =>
  NextResponse.json({ data, error: null }, { status });

export const err  = (message: string, status = 400) =>
  NextResponse.json({ data: null, error: message }, { status });

export const created = <T>(data: T) => ok(data, 201);

// ── Auth guard for API routes ─────────────────────────────────────────────────
export async function requireApiAuth(roles?: UserRole[]) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { user: null, profile: null, supabase, denied: err('Unauthorized', 401) };
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return { user, profile: null, supabase, denied: err('User profile not found — run the SQL migrations', 404) };
    }

    if (roles && !roles.includes(profile.role)) {
      return { user, profile, supabase, denied: err('Forbidden', 403) };
    }

    return { user, profile, supabase, denied: null };

  } catch (e) {
    console.error('requireApiAuth error:', e);
    return { user: null, profile: null, supabase: null as any, denied: err('Server error', 500) };
  }
}

// ── Pagination helper ─────────────────────────────────────────────────────────
export function getPagination(searchParams: URLSearchParams) {
  const page  = Math.max(1, Number(searchParams.get('page') || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));
  const from  = (page - 1) * limit;
  const to    = from + limit - 1;
  return { page, limit, from, to };
}

export function paginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
  return NextResponse.json({
    data,
    error: null,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}
