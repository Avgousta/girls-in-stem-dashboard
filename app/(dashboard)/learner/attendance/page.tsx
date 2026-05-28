import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { fmt } from '@/utils';
import { redirect } from 'next/navigation';

export default async function LearnerAttendancePage() {
  const user = await requireAuth(['learner']);
  // Redirect to the proper student portal
  redirect('/student/attendance');
}
