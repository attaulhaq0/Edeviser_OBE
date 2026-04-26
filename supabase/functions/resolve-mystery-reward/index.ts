import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Types ──────────────────────────────────────────────────────────────────

type MysteryRewardType = 'xp_multiplier' | 'cosmetic' | 'boost';

interface MysteryRewardWeights {
  xp_multiplier: number;
  cosmetic: number;
  boost: number;
}

interface ResolveRequest {
  student_id: string;
  /** Optional: the XP transaction that triggered this mystery box */
  triggering_xp_transaction_id?: string;
}

interface MysteryRewardResult {
  type: MysteryRewardType;
  xp_multiplier?: number;
  cosmetic_item_id?: string | null;
  boost_duration_minutes?: number;
  boost_id?: string;
  description: string;
}

// ─── Default Weights ────────────────────────────────────────────────────────

const DEFAULT_WEIGHTS: MysteryRewardWeights = {
  xp_multiplier: 50,
  cosmetic: 30,
  boost: 20,
};

// ─── Pure Outcome Selection ─────────────────────────────────────────────────

function selectOutcome(randomValue: number, weights: MysteryRewardWeights): MysteryRewardType {
  const normalized = Math.abs(Math.round(randomValue)) % 100;
  const xpThreshold = weights.xp_multiplier;
  const cosmeticThreshold = xpThreshold + weights.cosmetic;

  if (normalized < xpThreshold) return 'xp_multiplier';
  if (normalized < cosmeticThreshold) return 'cosmetic';
  return 'boost';
}

// ─── Main Handler ───────────────────────────────────────────────────────────

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

    const body: ResolveRequest = await req.json();
    const studentId = body.student_id ?? user.id;

    // Get student's institution_id
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('institution_id')
      .eq('id', studentId)
      .single();

    if (profileErr || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch institution-level mystery box weights (if configured)
    const { data: settings } = await supabaseAdmin
      .from('institution_settings')
      .select('mystery_box_weights')
      .eq('institution_id', profile.institution_id)
      .maybeSingle();

    const weights: MysteryRewardWeights = settings?.mystery_box_weights
      ? {
          xp_multiplier: (settings.mystery_box_weights as Record<string, number>).xp_multiplier ?? DEFAULT_WEIGHTS.xp_multiplier,
          cosmetic: (settings.mystery_box_weights as Record<string, number>).cosmetic ?? DEFAULT_WEIGHTS.cosmetic,
          boost: (settings.mystery_box_weights as Record<string, number>).boost ?? DEFAULT_WEIGHTS.boost,
        }
      : DEFAULT_WEIGHTS;

    // ── 19.1.1: Probability-weighted outcome selection ──────────────────
    const randomValue = Math.floor(Math.random() * 100);
    const outcomeType = selectOutcome(randomValue, weights);

    let result: MysteryRewardResult;

    switch (outcomeType) {
      // ── 19.1.4: XP multiplier application for 2x XP outcomes ──────────
      case 'xp_multiplier': {
        // Record that the next XP award should be doubled.
        // The client will pass this flag to the next award-xp call.
        result = {
          type: 'xp_multiplier',
          xp_multiplier: 2.0,
          description: '2x XP Multiplier! Your next XP award is doubled!',
        };

        // Store a pending 2x multiplier for the student's next XP award
        await supabaseAdmin.from('student_active_boosts').insert({
          student_id: studentId,
          boost_type: 'mystery_xp_multiplier',
          multiplier: 2.0,
          purchase_id: null as unknown as string, // mystery box, not a purchase
          activated_at: new Date().toISOString(),
          // Short-lived: 10 minutes to use the 2x on next action
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        }).then(({ error }) => {
          if (error) {
            console.error('Failed to insert mystery XP multiplier boost:', error.message);
          }
        });

        break;
      }

      // ── 19.1.2: Cosmetic item grant for cosmetic outcomes ─────────────
      case 'cosmetic': {
        // Find eligible cosmetic items the student doesn't already own
        const { data: ownedItems } = await supabaseAdmin
          .from('xp_purchases')
          .select('item_id')
          .eq('student_id', studentId)
          .neq('status', 'refunded');

        const ownedItemIds = (ownedItems ?? []).map((p: { item_id: string }) => p.item_id);

        let cosmeticQuery = supabaseAdmin
          .from('marketplace_items')
          .select('id, name, metadata')
          .eq('institution_id', profile.institution_id)
          .eq('category', 'cosmetic')
          .eq('is_active', true);

        if (ownedItemIds.length > 0) {
          cosmeticQuery = cosmeticQuery.not('id', 'in', `(${ownedItemIds.join(',')})`);
        }

        const { data: eligibleCosmetics } = await cosmeticQuery;

        if (eligibleCosmetics && eligibleCosmetics.length > 0) {
          // Pick a random cosmetic from eligible pool
          const selectedIndex = randomValue % eligibleCosmetics.length;
          const selectedCosmetic = eligibleCosmetics[selectedIndex];

          // Grant the cosmetic to the student (insert as a free purchase with 0 cost)
          const { data: purchase } = await supabaseAdmin
            .from('xp_purchases')
            .insert({
              student_id: studentId,
              item_id: selectedCosmetic.id,
              xp_cost: 0,
              status: 'active',
              purchased_at: new Date().toISOString(),
              metadata: { source: 'mystery_reward_box' },
            })
            .select('id')
            .single();

          result = {
            type: 'cosmetic',
            cosmetic_item_id: selectedCosmetic.id,
            description: `Rare Cosmetic Unlocked: ${selectedCosmetic.name}! Check your inventory.`,
          };
        } else {
          // No eligible cosmetics — fallback to XP multiplier
          result = {
            type: 'xp_multiplier',
            xp_multiplier: 2.0,
            description: 'No new cosmetics available — 2x XP Multiplier applied instead!',
          };
        }

        break;
      }

      // ── 19.1.3: Temporary boost activation for boost outcomes ─────────
      case 'boost': {
        const boostDurationMinutes = 30;
        const expiresAt = new Date(Date.now() + boostDurationMinutes * 60 * 1000).toISOString();

        const { data: boostRecord, error: boostErr } = await supabaseAdmin
          .from('student_active_boosts')
          .insert({
            student_id: studentId,
            boost_type: 'mystery_boost',
            multiplier: 2.0,
            purchase_id: null as unknown as string, // mystery box, not a purchase
            activated_at: new Date().toISOString(),
            expires_at: expiresAt,
          })
          .select('id')
          .single();

        if (boostErr) {
          console.error('Failed to insert mystery boost:', boostErr.message);
        }

        result = {
          type: 'boost',
          boost_duration_minutes: boostDurationMinutes,
          boost_id: boostRecord?.id ?? undefined,
          description: '30-Minute XP Boost! All XP earned in the next 30 minutes is doubled.',
        };

        break;
      }
    }

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      action: 'mystery_reward_resolved',
      entity_type: 'mystery_reward',
      entity_id: studentId,
      performed_by: user.id,
      institution_id: profile.institution_id,
      changes: {
        outcome_type: result!.type,
        random_value: randomValue,
        weights,
        triggering_xp_transaction_id: body.triggering_xp_transaction_id ?? null,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      reward: result!,
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
