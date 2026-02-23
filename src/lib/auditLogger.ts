import { supabase } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

export interface AuditLogEntry {
  action: string;
  entity_type: string;
  entity_id: string;
  changes: Record<string, unknown> | null;
  performed_by: string;
}

export const logAuditEvent = async (entry: AuditLogEntry): Promise<void> => {
  try {
    const { error } = await db.from('audit_logs').insert({
      action: entry.action,
      target_type: entry.entity_type,
      target_id: entry.entity_id,
      diff: entry.changes,
      actor_id: entry.performed_by,
    });

    if (error) {
      console.error('[AuditLogger] Failed to log audit event:', error.message);
    }
  } catch (err) {
    console.error('[AuditLogger] Unexpected error:', err);
  }
};
