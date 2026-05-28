import { createClient } from '@/lib/supabase/server';

interface NotificationPayload {
  user_id:    string;
  learner_id?: string;
  type:       string;
  title:      string;
  body:       string;
}

export async function createNotification(payload: NotificationPayload) {
  try {
    const supabase = await createClient();
    await supabase.from('notifications').insert(payload);
  } catch (e) {
    console.error('Failed to create notification:', e);
  }
}

// Notify all parents/guardians of a learner
export async function notifyParent(learnerId: string, type: string, title: string, body: string) {
  try {
    const supabase = await createClient();
    const { data: learner } = await supabase
      .from('learners')
      .select('parent_id')
      .eq('learner_id', learnerId)
      .single();

    if ((learner as any)?.parent_id) {
      await createNotification({
        user_id:    (learner as any).parent_id,
        learner_id: learnerId,
        type, title, body,
      });
    }
  } catch (e) {
    console.error('notifyParent failed:', e);
  }
}

// Notify learner directly (if they have a user account)
export async function notifyLearner(learnerId: string, type: string, title: string, body: string) {
  try {
    const supabase = await createClient();
    const { data: learner } = await supabase
      .from('learners')
      .select('user_id')
      .eq('learner_id', learnerId)
      .single();

    if ((learner as any)?.user_id) {
      await createNotification({
        user_id:    (learner as any).user_id,
        learner_id: learnerId,
        type, title, body,
      });
    }
  } catch (e) {
    console.error('notifyLearner failed:', e);
  }
}
