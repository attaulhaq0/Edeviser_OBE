import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Types ──────────────────────────────────────────────────────────────────

type XPSource =
  | 'login'
  | 'submission'
  | 'badge'
  | 'admin_adjustment'
  | 'perfect_day'
  | 'first_attempt_bonus'
  | 'perfect_rubric'
  | 'bonus_event'
  | 'discussion_question'
  | 'discussion_answer'
  | 'survey_completion'
  | 'quiz_completion'
  | 'streak_milestone'
  | 'journal'
  | 'grade';

interface XPAwardPayload {
  student_id: string;
  xp_amount: number;
  source: XPSource;
  reference_id?: string;
  note?: string;
}

interface LevelThreshold {
  level: number;
  xpRequired: number;
}

// ─── Level Thresholds ───────────────────────────────────────────────────────

function generateLevelThresholds(): LevelThreshold[] {
  const thresholds: LevelThreshold[] = [
    { level: 1, xpRequired: 0 },
    { level: 2, xpRequired: 100 },
    { level: 3, xpRequired: 250 },
  ];

  for (let n = 4; n <= 50; n++) {
    thresholds.push({
      level: n,
      xpRequired: Math.floor(50 * Math.pow(n, 1.5)),
    });
  }

  return thresholds;
}

const LEVEL_THRESHOLDS = generateLevelThresholds();

function calculateLevel(xpTotal: number): number {
  if (xpTotal < 0) return 1;

  let level = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (xpTotal >= threshold.xpRequired) {
      level = threshold.level;
    } else {
      break;
    }
  }
  return level;
}

// ─── Validation ─────────────────────────────────────────────────────────────

const VALID_SOURCES: XPSource[] = [
  'login', 'submission', 'badge', 'admin_adjustment', 'perfect_day',
  'first_attempt_bonus', 'perfect_rubric', 'bonus_event',
  'discussion_question', 'discussion_answer', 'survey_completion',
  'quiz_completion', 'streak_milestone', 'journal', 'grade',
];

function validatePayload(payload: unknown): { valid: true; data: XPAwardPayload } | { valid: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const p = payload as Record<string, unknown>;

  if (!p.student_id || typeof p.student_id !== 'string') {
    return { valid: false, error: 'student_id is required and must be a string' };
  }

  if (p.xp_amount === undefined || p.xp_amount === null || typeof p.xp_amount !== 'number') {
    return { valid: false, error: 'xp_amount is required and must be a number' };
  }

  if (!p.source || typeof p.source !== 'string' || !VALID_SOURCES.includes(p.source as XPSource)) {
    return { valid: false, error: `source is required and must be one of: ${VALID_SOURCES.join(', ')}` };
  }

  return {
    valid: true,
    data: {
      student_id: p.student_id as string,
      xp_amount: p.xp_amount as number,
      source: p.source as XPSource,
      reference_id: typeof p.reference_id === 'string' ? p.reference_id : undefined,
      note: typeof p.note === 'string' ? p.note : undefined,
    },
  };
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();
    const validation = validatePayload(body);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { student_id, xp_amount, source, reference_id, note } = validation.data;

    // Handle zero XP — still record the transaction but skip level recalculation
    if (xp_amount === 0) {
      const { error: insertErr } = await supabase
        .from('xp_transactions')
        .insert({
          student_id,
          xp_amount: 0,
          source,
          reference_id: reference_id ?? null,
          note: note ?? null,
        });

      if (insertErr) {
        console.error('XP transaction insert failed:', insertErr.message);
        return new Response(
          JSON.stringify({ error: 'Failed to insert XP transaction', detail: insertErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({ success: true, xp_awarded: 0, new_total: 0, level_up: false, new_level: 1 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Step 1: Check for active bonus XP events ──────────────────────────

    let finalXP = xp_amount;

    const { data: bonusEvents, error: bonusErr } = await supabase
      .from('bonus_xp_events')
      .select('multiplier')
      .lte('start_date', new Date().toISOString())
      .gte('end_date', new Date().toISOString());

    if (bonusErr) {
      console.error('Bonus event query failed:', bonusErr.message);
      // Continue without multiplier — don't block XP award
    }

    if (bonusEvents && bonusEvents.length > 0) {
      // Apply the highest active multiplier
      const maxMultiplier = Math.max(...bonusEvents.map((e: { multiplier: number }) => e.multiplier));
      if (maxMultiplier > 1) {
        finalXP = Math.floor(xp_amount * maxMultiplier);
      }
    }

    // ── Step 2: Insert XP transaction ─────────────────────────────────────

    const { error: insertErr } = await supabase
      .from('xp_transactions')
      .insert({
        student_id,
        xp_amount: finalXP,
        source,
        reference_id: reference_id ?? null,
        note: note ?? null,
      });

    if (insertErr) {
      console.error('XP transaction insert failed:', insertErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to insert XP transaction', detail: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Step 3: Recalculate xp_total ──────────────────────────────────────

    const { data: sumResult, error: sumErr } = await supabase
      .from('xp_transactions')
      .select('xp_amount')
      .eq('student_id', student_id);

    if (sumErr) {
      console.error('XP sum query failed:', sumErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to calculate XP total', detail: sumErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const newTotal = (sumResult ?? []).reduce(
      (sum: number, row: { xp_amount: number }) => sum + row.xp_amount,
      0,
    );

    // ── Step 4: Calculate new level ───────────────────────────────────────

    const newLevel = calculateLevel(newTotal);

    // Fetch current gamification record to detect level-up
    const { data: currentGamification } = await supabase
      .from('student_gamification')
      .select('level')
      .eq('student_id', student_id)
      .maybeSingle();

    const previousLevel = currentGamification?.level ?? 1;
    const levelUp = newLevel > previousLevel;

    // ── Step 5: UPSERT student_gamification ───────────────────────────────

    const { error: upsertErr } = await supabase
      .from('student_gamification')
      .upsert(
        {
          student_id,
          xp_total: newTotal,
          level: newLevel,
        },
        { onConflict: 'student_id' },
      );

    if (upsertErr) {
      console.error('Gamification upsert failed:', upsertErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to update gamification record', detail: upsertErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Response ──────────────────────────────────────────────────────────

    return new Response(
      JSON.stringify({
        success: true,
        xp_awarded: finalXP,
        new_total: newTotal,
        level_up: levelUp,
        new_level: newLevel,
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
