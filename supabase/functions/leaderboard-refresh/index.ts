import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Refresh the leaderboard_weekly materialized view
    const { error } = await supabase.rpc('sql', {
      query: 'REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_weekly',
    });

    if (error) {
      // Fallback: try without CONCURRENTLY
      const { error: fallbackError } = await supabase.rpc('sql', {
        query: 'REFRESH MATERIALIZED VIEW leaderboard_weekly',
      });

      if (fallbackError) {
        return new Response(
          JSON.stringify({ success: false, error: fallbackError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        refreshed_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
