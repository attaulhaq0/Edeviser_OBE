import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyCronSecret, invokeEdgeFunction } from "../_utils/auth.js";

/**
 * Active-hours warm-ping (spec: dashboard-and-ux-performance, Req 10).
 *
 * The free-tier Supabase instance pauses on idle; the first request after a
 * pause pays a ~1–3s cold-start. A lightweight, frequent ping during active
 * hours keeps it warm so real users rarely hit the cold path.
 *
 * It invokes the existing `health` edge function, which runs `SELECT 1` — so a
 * ping wakes BOTH the edge runtime and Postgres (Req 10.1). Outside the
 * configured active-hours window it is a deliberate no-op so the cron never
 * burns free-tier compute/egress overnight (Req 10.2). Verification is via
 * Vercel/Supabase function logs + a cold-vs-warm first-request measurement
 * (Req 10.3) — a deploy-time check, not a unit test.
 *
 * Active hours are UTC and env-configurable (defaults 06:00–23:00 UTC). The
 * Vercel cron schedule (`vercel.json`) already restricts the firing hours; this
 * in-handler gate is defense-in-depth and lets the window be tuned via env
 * without redeploying a schedule change.
 */
const START_HOUR_UTC = Number(process.env.WARM_PING_START_HOUR_UTC ?? "6");
const END_HOUR_UTC = Number(process.env.WARM_PING_END_HOUR_UTC ?? "23");

/**
 * True when `now`'s UTC hour is inside [start, end). Supports a wrap-around
 * window (start > end) for completeness, though the default does not wrap.
 */
export function isWithinActiveHours(
  now: Date,
  start: number,
  end: number
): boolean {
  const h = now.getUTCHours();
  return start <= end ? h >= start && h < end : h >= start || h < end;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!verifyCronSecret(req, res)) return;

  if (!isWithinActiveHours(new Date(), START_HOUR_UTC, END_HOUR_UTC)) {
    res
      .status(200)
      .json({ skipped: true, reason: "outside active hours (UTC)" });
    return;
  }

  try {
    const { status, data } = await invokeEdgeFunction("health");
    // Surface the upstream status so a degraded DB is visible in cron logs,
    // but never throw — a warm-ping failure must not page anyone.
    res.status(status >= 200 && status < 300 ? 200 : 502).json({
      pinged: true,
      upstreamStatus: status,
      health: data,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}
