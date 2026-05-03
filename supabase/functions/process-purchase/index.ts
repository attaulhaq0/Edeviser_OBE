import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS Headers ───────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Types ──────────────────────────────────────────────────────────────────

type PurchaseErrorCode =
  | "INSUFFICIENT_BALANCE"
  | "LEVEL_REQUIREMENT"
  | "OUT_OF_STOCK"
  | "ALREADY_OWNED"
  | "ITEM_INACTIVE"
  | "SALE_EXPIRED"
  | "MAX_INVENTORY";

interface PurchaseRPCResult {
  success: boolean;
  purchase_id?: string;
  xp_cost?: number;
  new_balance?: number;
  item_category?: string;
  item_sub_category?: string;
  error_code?: PurchaseErrorCode;
  detail?: Record<string, unknown>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(
  message: string,
  status: number,
  errorCode?: PurchaseErrorCode,
  detail?: Record<string, unknown>
): Response {
  return jsonResponse(
    {
      success: false,
      error: message,
      ...(errorCode ? { error_code: errorCode } : {}),
      ...(detail ? { detail } : {}),
    },
    status
  );
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Parse request body ────────────────────────────────────────────────

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Request body must be valid JSON", 400);
    }

    const itemId = body.item_id;
    if (!itemId || typeof itemId !== "string") {
      return errorResponse("item_id is required and must be a UUID string", 400);
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(itemId)) {
      return errorResponse("item_id must be a valid UUID", 400);
    }

    // ── 3.1.1: JWT validation and institution_id extraction ───────────────

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return errorResponse("Missing Authorization header", 401);
    }

    // Create a user-scoped client to validate the JWT
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return errorResponse("Invalid or expired authentication token", 401);
    }

    const studentId = user.id;

    // Create service role client for DB operations (bypasses RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch institution_id from the student's profile
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("institution_id, role")
      .eq("id", studentId)
      .maybeSingle();

    if (profileErr || !profile) {
      return errorResponse("Failed to fetch student profile", 400);
    }

    if (profile.role !== "student") {
      return errorResponse("Only students can make marketplace purchases", 403);
    }

    const institutionId = profile.institution_id;
    if (!institutionId) {
      return errorResponse("Student is not associated with an institution", 400);
    }

    // ── 3.1.2: Call process_marketplace_purchase RPC function ─────────────

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "process_marketplace_purchase",
      {
        p_student_id: studentId,
        p_item_id: itemId,
        p_institution_id: institutionId,
      }
    );

    if (rpcError) {
      console.error("RPC process_marketplace_purchase failed:", rpcError.message);
      return errorResponse(
        "Purchase processing failed",
        500,
        undefined,
        { detail: rpcError.message }
      );
    }

    const result = rpcResult as PurchaseRPCResult;

    // If the RPC returned an error_code, map it to the appropriate HTTP status
    if (!result.success) {
      const errorCodeStatusMap: Record<PurchaseErrorCode, number> = {
        INSUFFICIENT_BALANCE: 400,
        LEVEL_REQUIREMENT: 403,
        OUT_OF_STOCK: 409,
        ALREADY_OWNED: 409,
        ITEM_INACTIVE: 404,
        SALE_EXPIRED: 409,
        MAX_INVENTORY: 409,
      };

      const code = result.error_code as PurchaseErrorCode;
      const status = errorCodeStatusMap[code] ?? 400;

      const errorMessages: Record<PurchaseErrorCode, string> = {
        INSUFFICIENT_BALANCE: "Insufficient XP balance for this purchase",
        LEVEL_REQUIREMENT: "You do not meet the level requirement for this item",
        OUT_OF_STOCK: "This item is out of stock",
        ALREADY_OWNED: "You already own this item",
        ITEM_INACTIVE: "This item is no longer available",
        SALE_EXPIRED: "The sale for this item has expired",
        MAX_INVENTORY: "You have reached the maximum inventory for this item type",
      };

      return errorResponse(
        errorMessages[code] ?? "Purchase failed",
        status,
        code,
        result.detail as Record<string, unknown> | undefined
      );
    }

    // ── 3.1.3: Post-purchase activation: XP boost ────────────────────────
    // If the purchased item is a power_up with sub_category xp_boost,
    // insert into student_active_boosts with 1 hour expiry

    if (
      result.item_category === "power_up" &&
      result.item_sub_category === "xp_boost"
    ) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

      const { error: boostErr } = await supabase
        .from("student_active_boosts")
        .insert({
          student_id: studentId,
          boost_type: "xp_boost",
          multiplier: 2.0,
          purchase_id: result.purchase_id,
          activated_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        });

      if (boostErr) {
        console.error("Failed to activate XP boost:", boostErr.message);
        // Non-blocking: purchase succeeded, boost activation failed
        // Log but don't fail the response
      }
    }

    // ── 3.1.4: Post-purchase activation: streak shield ───────────────────
    // If the purchased item is a power_up with sub_category streak_shield,
    // increment streak_freezes_available in student_gamification (max 3)

    if (
      result.item_category === "power_up" &&
      result.item_sub_category === "streak_shield"
    ) {
      // Fetch current streak_freezes_available
      const { data: gamification, error: gamErr } = await supabase
        .from("student_gamification")
        .select("streak_freezes_available")
        .eq("student_id", studentId)
        .maybeSingle();

      if (gamErr) {
        console.error(
          "Failed to fetch gamification for streak shield:",
          gamErr.message
        );
      } else {
        const currentFreezes = gamification?.streak_freezes_available ?? 0;

        // Only increment if under the max of 3 (the RPC already validated this,
        // but we double-check for safety)
        if (currentFreezes < 3) {
          const { error: updateErr } = await supabase
            .from("student_gamification")
            .upsert(
              {
                student_id: studentId,
                streak_freezes_available: currentFreezes + 1,
              },
              { onConflict: "student_id" }
            );

          if (updateErr) {
            console.error(
              "Failed to increment streak_freezes_available:",
              updateErr.message
            );
          }
        }
      }
    }

    // ── 3.1.5: Audit log insertion ───────────────────────────────────────

    try {
      await supabase.from("audit_logs").insert({
        action: "marketplace_purchase",
        entity_type: "xp_purchases",
        entity_id: result.purchase_id,
        performed_by: studentId,
        institution_id: institutionId,
        changes: {
          item_id: itemId,
          xp_cost: result.xp_cost,
          new_balance: result.new_balance,
          item_category: result.item_category,
          item_sub_category: result.item_sub_category,
        },
      });
    } catch (auditErr) {
      // Non-blocking: purchase succeeded, audit log failed
      console.error("Audit log insertion failed:", auditErr);
    }

    // ── 3.1.6: Structured success response ───────────────────────────────

    return jsonResponse({
      success: true,
      purchase_id: result.purchase_id,
      xp_cost: result.xp_cost,
      new_balance: result.new_balance,
      item_category: result.item_category,
      item_sub_category: result.item_sub_category,
    });
  } catch (error) {
    console.error("Unexpected error in process-purchase:", error);
    return errorResponse(
      (error as Error).message ?? "Internal server error",
      500
    );
  }
});
