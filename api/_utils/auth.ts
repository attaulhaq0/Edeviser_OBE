import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Validates that the incoming request has a valid CRON_SECRET.
 * Vercel Cron Jobs send the secret via the `authorization` header as `Bearer <secret>`.
 * Returns true if authorized, false otherwise (and sends 401 response).
 */
export function verifyCronSecret(req: VercelRequest, res: VercelResponse): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    res.status(500).json({ error: 'CRON_SECRET not configured' });
    return false;
  }

  const authHeader = req.headers.authorization ?? '';
  if (authHeader !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  return true;
}

/**
 * Calls a Supabase Edge Function by name.
 * Uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 */
export async function invokeEdgeFunction(
  functionName: string,
  body: Record<string, unknown> = {},
): Promise<{ status: number; data: unknown }> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  }

  const url = `${supabaseUrl}/functions/v1/${functionName}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}
