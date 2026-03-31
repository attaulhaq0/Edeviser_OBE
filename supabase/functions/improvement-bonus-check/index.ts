// Task 139.1: Improvement Bonus Check Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IMPROVEMENT_THRESHOLD_PP = 15;
const IMPROVEMENT_BONUS_XP = 50;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { student_id, clo_id, current_score_percent } = await req.json();
    if (!student_id || !clo_id || current_score_percent === undefined) {
      return new Response(
        JSON.stringify({ error: 'student_id, clo_id, and current_score_percent are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const { data: prevEvidence, error: prevErr } = await supabase
      .from('evidence')
      .select('score_percent')
      .eq('student_id', student_id)
      .eq('clo_id', clo_id)
      .order('created_at', { ascending: false })
      .limit(2);
    if (prevErr) throw prevErr;
    if (!prevEvidence || prevEvidence.length < 2) {
      return new Response(
        JSON.stringify({ success: true, bonus_awarded: false, reason: 'No previous evidence' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const previousPercent = prevEvidence[1].score_percent;
    const improvement = current_score_percent - previousPercent;
    if (improvement < IMPROVEMENT_THRESHOLD_PP) {
      return new Response(
        JSON.stringify({ success: true, bonus_awarded: false, improvement, reason: 'Improvement below 15pp threshold' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    // Award 50 XP with source = improvement_bonus (Req 123.5)
    const noteData = {
      action_type: 'improvement_bonus',
      clo_id,
      previous_percent: previousPercent,
      current_percent: current_score_percent,
      improvement_pp: improvement,
    };
    await supabase.functions.invoke('award-xp', {
      body: {
        student_id,
        xp_amount: IMPROVEMENT_BONUS_XP,
        source: 'improvement_bonus',
        reference_id: 'improvement:' + clo_id + ':' + Date.now(),
        note: JSON.stringify(noteData),
      },
    });
    return new Response(
      JSON.stringify({
        success: true,
        bonus_awarded: true,
        improvement,
        xp_awarded: IMPROVEMENT_BONUS_XP,
        previous_percent: previousPercent,
        current_percent: current_score_percent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});