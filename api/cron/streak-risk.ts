import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyCronSecret, invokeEdgeFunction } from '../_utils/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!verifyCronSecret(req, res)) return;

  try {
    const { status, data } = await invokeEdgeFunction('streak-risk-cron');
    res.status(status).json(data);
  } catch (error) {
    console.error('streak-risk cron failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
