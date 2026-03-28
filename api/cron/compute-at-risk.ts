import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyCronSecret, invokeEdgeFunction } from '../_utils/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!verifyCronSecret(req, res)) return;

  try {
    const { status, data } = await invokeEdgeFunction('compute-at-risk-signals');
    res.status(status).json(data);
  } catch (error) {
    console.error('compute-at-risk cron failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : message });
  }
}
