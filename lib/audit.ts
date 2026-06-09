/**
 * Audit logging — records who did what to which record.
 * Call auditLog() from API route handlers after successful mutations.
 * All writes go through service_role so RLS doesn't block them.
 */
import { createClient } from '@/lib/supabase/server';

interface AuditEntry {
  actor_id?:    string | null;
  actor_email?: string | null;
  actor_role?:  string | null;
  action:       string;        // e.g. 'learner.delete', 'assessment.create'
  entity_type:  string;        // e.g. 'learner', 'assessment'
  entity_id?:   string | null;
  entity_label?:string | null; // e.g. learner full name
  changes?:     { before?: Record<string, unknown>; after?: Record<string, unknown> };
  ip_address?:  string | null;
  user_agent?:  string | null;
}

export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from('audit_log').insert({
      actor_id:     entry.actor_id    ?? null,
      actor_email:  entry.actor_email ?? null,
      actor_role:   entry.actor_role  ?? null,
      action:       entry.action,
      entity_type:  entry.entity_type,
      entity_id:    entry.entity_id   ?? null,
      entity_label: entry.entity_label ?? null,
      changes:      entry.changes     ?? null,
      ip_address:   entry.ip_address  ?? null,
      user_agent:   entry.user_agent  ?? null,
    });
  } catch (e) {
    // Audit failure must never break the main request
    console.error('[audit] Failed to write audit log:', e);
  }
}
