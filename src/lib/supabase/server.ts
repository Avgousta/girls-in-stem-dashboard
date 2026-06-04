import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function createClient() {
  const cookieStore = await cookies();

  if (!SUPABASE_URL || !SUPABASE_ANON) {
    console.error('\n❌ MISSING SUPABASE ENV VARS\n');
    return createServerClient('https://placeholder.supabase.co', 'placeholder', {
      cookies: { get: () => undefined, set: () => {}, remove: () => {} },
    });
  }

  return createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try { cookieStore.set({ name, value, ...options }); } catch { /* Server Component — ignore */ }
      },
      remove(name: string, options: CookieOptions) {
        try { cookieStore.set({ name, value: '', ...options }); } catch { /* Server Component — ignore */ }
      },
    },
  });
}

export function createAdminClient() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createClient: sb } = require('@supabase/supabase-js');
  return sb(
    SUPABASE_URL  ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
