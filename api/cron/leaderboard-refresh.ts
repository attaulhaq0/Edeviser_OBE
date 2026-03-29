import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyCronSecret, invokeEdgeFunction } from '../_utils/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!verifyCronSecret(req, res)) return;

  try {
    // The leaderboard refresh in pg_cron runs a SQL REFRESH MATERIALIZED VIEW directly.
    // Via Vercel, we call a lightweight Edge Function that does the same.
    const { status, data } = await invokeEdgeFunction('leaderboard-refresh');
    res.status(status).json(data);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}
