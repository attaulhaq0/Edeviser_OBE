import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyCronSecret, invokeEdgeFunction } from "../_utils/auth.js";

/**
 * Active-hours warm-ping (spec: dashboard-and-ux-performance, Req 10).
 *
 * The free-tier Supabase instance is PAUSED after ~7 days of inactivity, and a
 * paused project makes the next request fail until it is restored. A scheduled
 * ping keeps the project active so real users never hit a paused project.
 *
 * It invokes the existing `health` edge function, which runs `SELECT 1` — so a
 * ping wakes BOTH the edge runtime and Postgres (Req 10.1). Outside the
 * configured active-hours window it is a deliberate no-op (Req 10.2).
 *
 * SCHEDULE / PLAN CONSTRAINT: Vercel **Hobby** crons may only run **once per
 * day** — a sub-daily expression (an "every-N-minutes" schedule) fails at
 * deployment validation. So `vercel.json` schedules this DAILY (`0 6 * * *`),
 * which is what actually matters for the 7-day inactivity pause. On **Pro** the
 * schedule can be tightened (e.g. every 5 minutes between 06:00–22:00 UTC) for
 * short cold-start mitigation; the active-hours gate below already supports that
 * finer cadence.
 *
 * Verification is via Vercel/Supabase function logs (Req 10.3) — a deploy-time
 * check, not a unit test. Active hours are UTC and env-configurable
 * (defaults 06:00–23:00 UTC).
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
