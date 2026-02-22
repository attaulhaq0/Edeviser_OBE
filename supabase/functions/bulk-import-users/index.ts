import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRow {
  email: string;
  full_name: string;
  role: string;
  program_id?: string;
}

interface ImportResult {
  created: number;
  errors: Array<{ row: number; message: string }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, institution_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { rows } = (await req.json()) as { rows: ImportRow[] };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No rows provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (rows.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Maximum 1000 rows per import' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const result: ImportResult = { created: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            email: row.email,
            full_name: row.full_name,
            role: row.role,
            institution_id: profile.institution_id,
            is_active: true,
            ...(row.program_id ? { program_id: row.program_id } : {}),
          });

        if (insertError) {
          result.errors.push({ row: i + 2, message: insertError.message });
        } else {
          result.created++;
        }
      } catch (err) {
        result.errors.push({ row: i + 2, message: String(err) });
      }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
