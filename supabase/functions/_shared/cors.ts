/**
 * Shared CORS headers for all Edge Functions.
 * Reads allowed origin from ALLOWED_ORIGIN env var, defaults to production domain.
 * Set ALLOWED_ORIGIN in Supabase Dashboard > Edge Functions > Secrets for flexibility.
 */
const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://edeviser.vercel.app';

export const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
