import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify JWT and extract user
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { item_id } = await req.json();
    if (!item_id) {
      return new Response(JSON.stringify({ error: 'item_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get student's institution_id
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('institution_id, role')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (profile.role !== 'student') {
      return new Response(JSON.stringify({ error: 'Only students can make purchases' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call the atomic purchase processor RPC
    const { data: result, error: rpcError } = await supabaseAdmin.rpc(
      'process_marketplace_purchase',
      {
        p_student_id: user.id,
        p_item_id: item_id,
        p_institution_id: profile.institution_id,
      },
    );

    if (rpcError) {
      return new Response(JSON.stringify({ error: rpcError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!result.success) {
      return new Response(JSON.stringify({
        success: false,
        error_code: result.error_code,
        detail: result.detail ?? null,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Post-purchase activation based on category
    const category = result.item_category;
    const subCategory = result.item_sub_category;

    if (category === 'power_up' && subCategory === 'xp_boost') {
      // Activate 1-hour XP boost
      await supabaseAdmin.from('student_active_boosts').insert({
        student_id: user.id,
        boost_type: 'xp_boost',
        multiplier: 2.0,
        purchase_id: result.purchase_id,
        activated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
    } else if (category === 'power_up' && subCategory === 'streak_shield') {
      // Increment streak freezes available
      await supabaseAdmin.rpc('increment_streak_freezes', { p_student_id: user.id });
    }

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      action: 'marketplace_purchase',
      entity_type: 'xp_purchases',
      entity_id: result.purchase_id,
      performed_by: user.id,
      institution_id: profile.institution_id,
      changes: {
        item_id,
        xp_cost: result.xp_cost,
        category,
        sub_category: subCategory,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      purchase_id: result.purchase_id,
      xp_cost: result.xp_cost,
      new_balance: result.new_balance,
      item_category: category,
      item_sub_category: subCategory,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
