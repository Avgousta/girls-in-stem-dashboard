import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function createClient() {
  const cookieStore = await cookies();

  if (!SUPABASE_URL || !SUPABASE_ANON) {
    console.error(
      '\n❌ MISSING SUPABASE ENV VARS\n' +
      '   Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local\n'
    );
    // Return a dummy client that won't crash — pages will redirect to login
    return createServerClient('https://placeholder.supabase.co', 'placeholder', {
      cookies: { getAll: () => [], setAll: () => {} },
    });
  }

  return createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll can throw in Server Components — safe to ignore
          // Cookies will still be readable, just not refreshed
        }
      },
    },
  });
}

export function createAdminClient() {
  const { createClient: sb } = require('@supabase/supabase-js');
  return sb(
    SUPABASE_URL  ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
