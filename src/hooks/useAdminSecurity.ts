// =============================================================================
// useAdminSecurity — read hook for the Admin Security console (net-new UI)
// =============================================================================
//
// Surfaces three existing, admin-scoped tables that previously had no UI:
//   • blocked_ips        — IPs blocked by the login rate-limiter
//   • login_attempts     — per-email failed-login / lockout tracking
//   • rate_limit_events  — recent rate-limit / abuse signals
//
// No new backend logic — a plain read over existing tables (catalog §7). RLS on
// these tables enforces admin-only access server-side; this hook just queries.
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface BlockedIpRow {
  ip_address: string;
  blocked_until: string;
  reason: string;
  blocked_by: string | null;
  created_at: string;
}

export interface LoginAttemptRow {
  email: string;
  attempt_count: number;
  locked_until: string | null;
  updated_at: string;
}

export interface RateLimitEventRow {
  id: number;
  ip_address: string;
  event_type: string;
  user_id: string | null;
  metadata: unknown;
  occurred_at: string;
}

export interface AdminSecurityData {
  blockedIps: BlockedIpRow[];
  lockedAccounts: LoginAttemptRow[];
  rateLimitEvents: RateLimitEventRow[];
}

/** Max recent rate-limit events to pull for the console. */
export const RATE_LIMIT_EVENT_LIMIT = 100;

export const useAdminSecurity = () =>
  useQuery<AdminSecurityData>({
    queryKey: ["admin", "security", "overview"],
    queryFn: async () => {
      const [blocked, attempts, events] = await Promise.all([
        supabase
          .from("blocked_ips")
          .select("*")
          .order("created_at", { ascending: false })
          .returns<BlockedIpRow[]>(),
        supabase
          .from("login_attempts")
          .select("*")
          .order("updated_at", { ascending: false })
          .returns<LoginAttemptRow[]>(),
        supabase
          .from("rate_limit_events")
          .select("*")
          .order("occurred_at", { ascending: false })
          .limit(RATE_LIMIT_EVENT_LIMIT)
          .returns<RateLimitEventRow[]>(),
      ]);

      if (blocked.error) throw blocked.error;
      if (attempts.error) throw attempts.error;
      if (events.error) throw events.error;

      return {
        blockedIps: blocked.data ?? [],
        lockedAccounts: attempts.data ?? [],
        rateLimitEvents: events.data ?? [],
      };
    },
  });
