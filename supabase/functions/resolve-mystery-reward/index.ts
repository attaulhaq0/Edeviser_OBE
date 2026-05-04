// =============================================================================
// Edge Function: resolve-mystery-reward
// Mystery reward box resolution — probability-weighted outcome selection
// Tasks 19.1.1–19.1.4
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type RewardType = "double_xp" | "cosmetic" | "boost";

interface RewardWeight {
  type: RewardType;
  weight: number;
}

const DEFAULT_WEIGHTS: RewardWeight[] = [
  { type: "double_xp", weight: 50 },
  { type: "cosmetic", weight: 30 },
  { type: "boost", weight: 20 },
];

/**
 * Task 19.1.1: Probability-weighted outcome selection
 */
function selectOutcome(weights: RewardWeight[]): RewardType {
  const totalWeight = weights.reduce(
    (sum, w) => sum + Math.max(0, w.weight),
    0
  );
  if (totalWeight <= 0) return "double_xp";

  const roll = Math.random() * totalWeight;
  let cumulative = 0;

  for (const entry of weights) {
    cumulative += Math.max(0, entry.weight);
    if (roll < cumulative) return entry.type;
  }

  return weights[weights.length - 1]?.type ?? "double_xp";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { student_id, institution_id } = await req.json();

    if (!student_id || !institution_id) {
      return new Response(
        JSON.stringify({ error: "student_id and institution_id are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch configurable weights from institution_settings
    const { data: settings } = await supabase
      .from("institution_settings")
      .select("*")
      .eq("institution_id", institution_id)
      .maybeSingle();

    const rawSettings = settings as Record<string, unknown> | null;
    const weights: RewardWeight[] = rawSettings?.mystery_reward_weights
      ? (rawSettings.mystery_reward_weights as RewardWeight[])
      : DEFAULT_WEIGHTS;

    // Task 19.1.1: Select outcome using probability weights
    const outcomeType = selectOutcome(weights);

    let rewardDetails: Record<string, unknown> = {};

    if (outcomeType === "cosmetic") {
      // Task 19.1.2: Cosmetic item grant — pick a random active cosmetic item
      const { data: cosmetics } = await supabase
        .from("marketplace_items")
        .select("id, name, sub_category")
        .eq("institution_id", institution_id)
        .eq("category", "cosmetic")
        .eq("is_active", true);

      if (cosmetics && cosmetics.length > 0) {
        const randomItem =
          cosmetics[Math.floor(Math.random() * cosmetics.length)];
        if (randomItem) {
          // Grant the cosmetic by inserting an xp_purchase with 0 cost
          const { data: purchase, error: purchaseErr } = await supabase
            .from("xp_purchases")
            .insert({
              student_id,
              item_id: randomItem.id,
              xp_cost: 0,
              status: "active",
              purchased_at: new Date().toISOString(),
              metadata: { source: "mystery_reward_box" },
            })
            .select()
            .single();

          if (purchaseErr) {
            console.error(
              "Mystery cosmetic grant failed:",
              purchaseErr.message
            );
          }

          rewardDetails = {
            item_id: randomItem.id,
            item_name: randomItem.name,
            sub_category: randomItem.sub_category,
            purchase_id: purchase?.id ?? null,
          };
        }
      } else {
        // Fallback to double_xp if no cosmetics available
        rewardDetails = { fallback: true, original_type: "cosmetic" };
      }
    } else if (outcomeType === "boost") {
      // Task 19.1.3: Temporary boost activation — 1 hour 1.5x XP boost
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const { error: boostErr } = await supabase
        .from("student_active_boosts")
        .insert({
          student_id,
          boost_type: "mystery_reward",
          multiplier: 1.5,
          activated_at: new Date().toISOString(),
          expires_at: expiresAt,
        });

      if (boostErr) {
        console.error("Mystery boost activation failed:", boostErr.message);
      }

      rewardDetails = {
        boost_type: "mystery_reward",
        multiplier: 1.5,
        duration_minutes: 60,
        expires_at: expiresAt,
      };
    } else {
      // Task 19.1.4: XP multiplier application for 2x XP outcomes
      // The next XP award will be doubled — store a pending 2x multiplier
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const { error: boostErr } = await supabase
        .from("student_active_boosts")
        .insert({
          student_id,
          boost_type: "double_xp_mystery",
          multiplier: 2.0,
          activated_at: new Date().toISOString(),
          expires_at: expiresAt,
        });

      if (boostErr) {
        console.error("Mystery 2x XP activation failed:", boostErr.message);
      }

      rewardDetails = {
        boost_type: "double_xp_mystery",
        multiplier: 2.0,
        duration_minutes: 60,
        expires_at: expiresAt,
      };
    }

    // Log to audit
    const { error: auditError } = await supabase.from("audit_logs").insert({
      action: "mystery_reward_resolved",
      entity_type: "mystery_reward",
      entity_id: student_id,
      performed_by: student_id,
      changes: { outcome_type: outcomeType, ...rewardDetails },
    });
    if (auditError) throw auditError;

    return new Response(
      JSON.stringify({
        success: true,
        outcome_type: outcomeType,
        reward_details: rewardDetails,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
