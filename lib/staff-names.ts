import { createAdminClient } from '@/lib/supabase/server';

/**
 * users RLS lets learners, parents and sponsors read only their own user row,
 * so embedded joins such as `users!mentor_id(full_name)` come back null for
 * them. This fills those joins in with the staff member's name and role only
 * (never email or phone), looked up with the service client.
 *
 * Each spec names the foreign-key column, the join's key on the row, and
 * optionally a path of nested keys to reach the rows (e.g. ['project_feedback']).
 * The FK column must be included in the original select.
 */
export interface StaffNameSpec { fk: string; as: string; path?: string[] }

type Obj = Record<string, unknown>;

function rowsAt(roots: Obj[], path: string[] = []): Obj[] {
  let level: Obj[] = roots;
  for (const key of path) {
    level = level.flatMap(r => {
      const v = r?.[key];
      return Array.isArray(v) ? (v as Obj[]) : v && typeof v === 'object' ? [v as Obj] : [];
    });
  }
  return level.filter(Boolean);
}

export async function fillStaffNames<T>(data: T, specs: StaffNameSpec[]): Promise<T> {
  if (!data) return data;
  const roots = (Array.isArray(data) ? data : [data]) as unknown as Obj[];

  const targets = specs.flatMap(s => rowsAt(roots, s.path).map(row => ({ row, s })))
    .filter(({ row, s }) => !row[s.as] && typeof row[s.fk] === 'string');
  if (!targets.length) return data;

  const ids = [...new Set(targets.map(t => t.row[t.s.fk] as string))];
  const { data: staff } = await createAdminClient()
    .from('users')
    .select('user_id, full_name, role')
    .in('user_id', ids)
    .in('role', ['admin', 'instructor']);

  const byId = new Map((staff ?? []).map((u: { user_id: string; full_name: string; role: string }) =>
    [u.user_id, { full_name: u.full_name, role: u.role }]));
  for (const { row, s } of targets) {
    const u = byId.get(row[s.fk] as string);
    if (u) row[s.as] = u;
  }
  return data;
}
