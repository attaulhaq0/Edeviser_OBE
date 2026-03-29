import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyCronSecret, invokeEdgeFunction } from '../_utils/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!verifyCronSecret(req, res)) return;

  try {
    const { status, data } = await invokeEdgeFunction('notification-digest');
    res.status(status).json(data);
  } catch (error) {
    console.error('notification-digest cron failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
