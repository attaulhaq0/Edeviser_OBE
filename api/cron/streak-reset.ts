import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyCronSecret, invokeEdgeFunction } from '../_utils/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!verifyCronSecret(req, res)) return;

  try {
    const { status, data } = await invokeEdgeFunction('process-streak', { type: 'midnight_reset' });
    res.status(status).json(data);
  } catch (error) {
    console.error('streak-reset cron failed:', error);
    const message = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
    res.status(500).json({ error: message });
  }
}
