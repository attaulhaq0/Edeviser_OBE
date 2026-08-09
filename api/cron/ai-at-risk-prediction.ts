import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyCronSecret, invokeEdgeFunction } from "../_utils/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!verifyCronSecret(req, res)) return;

  try {
    // Preserve the existing schedule while routing it through the canonical
    // background worker. This avoids a second, overlapping proactive cron.
    const { status, data } = await invokeEdgeFunction("agent-worker", {
      action: "scheduled_scan",
    });
    res.status(status).json(data);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}
