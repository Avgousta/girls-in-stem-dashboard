export const dynamic = 'force-dynamic';

import { requireApiAuth, ok, err } from '@/app/api/helpers';

export async function GET() {
  try {
    const { profile, denied } = await requireApiAuth();
    if (denied) return err('Not authenticated', 401);
    return ok(profile);
  } catch {
    return err('Not authenticated', 401);
  }
}