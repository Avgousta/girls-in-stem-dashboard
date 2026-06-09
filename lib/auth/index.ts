import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { UserRole, User } from '@/types';

export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createClient();

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const { data, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !data) {
      // Auth user exists but no profile row yet — means SQL migrations not run
      console.error('No user profile found for', user.email,
        '— did you run the INSERT INTO users SQL? (Setup Guide Phase 3 Step 18)');
      return null;
    }

    return data as User;
  } catch (err) {
    console.error('getCurrentUser error:', err);
    return null;
  }
}

export async function requireAuth(allowedRoles?: UserRole[]) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.is_active) redirect('/login?error=pending_approval');
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their correct home instead of showing 403
    if (user.role === 'learner')    redirect('/student');
    if (user.role === 'sponsor')    redirect('/sponsor');
    if (user.role === 'instructor')  redirect('/teacher');
    redirect('/dashboard');
  }
  return user;
}

export function canAccess(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin:      ['*'],
  instructor: ['learners:read','attendance:write','assessments:write','mentorship:write','interventions:write','programs:read'],
  learner:    ['own:read'],
  parent:     ['child:read'],
  sponsor:    ['sponsored:read'],
};

export function getRoleDashboardPath(role: UserRole): string {
  const paths: Record<UserRole, string> = {
    admin: '/dashboard', instructor: '/dashboard',
    learner: '/student', parent: '/parent', sponsor: '/sponsor',
  };
  return paths[role] ?? '/dashboard';
}
