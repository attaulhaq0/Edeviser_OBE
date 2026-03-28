import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthResponse {
  status: 'ok' | 'error';
  database: 'connected' | 'unreachable';
  timestamp: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const timestamp = new Date().toISOString();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Lightweight database connectivity check
    const { error } = await supabase.rpc('sql', { query: 'SELECT 1' }).maybeSingle();

    // Fallback: if rpc('sql') is unavailable, try a minimal table query
    if (error) {
      const { error: fallbackError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (fallbackError) {
        const response: HealthResponse = {
          status: 'error',
          database: 'unreachable',
          timestamp,
        };
        return new Response(JSON.stringify(response), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const response: HealthResponse = {
      status: 'ok',
      database: 'connected',
      timestamp,
    };
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    const response: HealthResponse = {
      status: 'error',
      database: 'unreachable',
      timestamp,
    };
    return new Response(JSON.stringify(response), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
