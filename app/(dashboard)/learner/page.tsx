import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function LearnerPortalPage() {
  await requireAuth(['learner']);
  redirect('/student');
}
