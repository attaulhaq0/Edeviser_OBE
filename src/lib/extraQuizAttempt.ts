// =============================================================================
// extraQuizAttempt — Check for active extra quiz attempt tokens
// =============================================================================

import { supabase } from "@/lib/supabase";

/**
 * Checks if a student has an active (unconsumed) extra quiz attempt token.
 * Returns the purchase_id if found, null otherwise.
 */
export async function getActiveExtraAttemptToken(
  studentId: string
): Promise<{ purchaseId: string } | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("xp_purchases")
    .select("id, item_id, marketplace_items:item_id (sub_category)")
    .eq("student_id", studentId)
    .eq("status", "active")
    .limit(50);

  if (error || !data) return null;

  const token = (data as Array<Record<string, unknown>>).find((row) => {
    const item = row.marketplace_items as Record<string, unknown> | null;
    return item?.sub_category === "extra_quiz_attempt";
  });

  return token ? { purchaseId: token.id as string } : null;
}

/**
 * Consumes an extra quiz attempt token by marking the purchase as consumed.
 */
export async function consumeExtraAttemptToken(
  purchaseId: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("xp_purchases")
    .update({ status: "consumed", consumed_at: new Date().toISOString() })
    .eq("id", purchaseId);

  if (error) throw error;
}

/**
 * Pure function: determines if a student can attempt a quiz.
 * Returns true if under the normal limit OR has an extra attempt token.
 */
export function canAttemptQuiz(
  attemptCount: number,
  maxAttempts: number,
  hasExtraToken: boolean
): boolean {
  if (attemptCount < maxAttempts) return true;
  if (hasExtraToken && attemptCount === maxAttempts) return true;
  return false;
}
