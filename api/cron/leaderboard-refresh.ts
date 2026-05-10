import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyCronSecret, invokeEdgeFunction } from "../_utils/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!verifyCronSecret(req, res)) return;

  try {
    // The leaderboard_weekly is now a regular VIEW (not materialized).
    // This cron just verifies the view is accessible and reports its state.
    const { status, data } = await invokeEdgeFunction("leaderboard-refresh");
    res.status(status).json(data);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}
