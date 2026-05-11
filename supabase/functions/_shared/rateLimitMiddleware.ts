// Shared rate-limit middleware for Edge Functions
// Checks rate_limit_events table for the caller's IP over a configured window
// Rejects with 429 if exceeded; writes audit_logs on rejection

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitConfig {
  eventType: string; // e.g. 'signup', 'invite_accept'
  maxRequests: number; // max requests in window
  windowMinutes: number; // window size in minutes
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export async function checkIpRateLimit(
  supabase: ReturnType<typeof createClient>,
  ipAddress: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const windowStart = new Date(
    Date.now() - config.windowMinutes * 60 * 1000
  ).toISOString();

  // Count events in window
  const { count, error } = await supabase
    .from("rate_limit_events")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", ipAddress)
    .eq("event_type", config.eventType)
    .gte("occurred_at", windowStart);

  if (error) {
    // On DB error, fail open (allow the request)
    console.error("Rate limit check failed:", error.message);
    return {
      allowed: true,
      remaining: config.maxRequests,
      retryAfterSeconds: 0,
    };
  }

  const currentCount = count ?? 0;
  const remaining = Math.max(0, config.maxRequests - currentCount);
  const allowed = currentCount < config.maxRequests;

  if (!allowed) {
    // Write audit log for rejection
    await supabase
      .from("audit_logs")
      .insert({
        action: "rate_limit_exceeded",
        entity_type: "rate_limit_events",
        entity_id: ipAddress,
        changes: {
          event_type: config.eventType,
          count: currentCount,
          limit: config.maxRequests,
        },
      })
      .catch(() => {}); // fire-and-forget
  }

  // Record this event
  await supabase
    .from("rate_limit_events")
    .insert({
      ip_address: ipAddress,
      event_type: config.eventType,
      metadata: { count: currentCount + 1 },
    })
    .catch(() => {}); // fire-and-forget

  const retryAfterSeconds = allowed ? 0 : config.windowMinutes * 60;

  return { allowed, remaining, retryAfterSeconds };
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "0.0.0.0"
  );
}
