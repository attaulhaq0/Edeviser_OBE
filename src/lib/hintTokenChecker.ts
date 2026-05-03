// =============================================================================
// hintTokenChecker — Check for active hint tokens before showing daily limit
// =============================================================================

import { supabase } from '@/lib/supabase';

export interface HintTokenStatus {
  hasActiveTokens: boolean;
  extraMessagesRemaining: number;
  purchaseId: string | null;
}

/**
 * Checks if a student has active hint token packs purchased today (UTC).
 * Hint tokens expire at midnight UTC on the day of purchase.
 */
export async function getHintTokenStatus(
  studentId: string,
): Promise<HintTokenStatus> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('xp_purchases')
    .select('id, purchased_at, metadata, marketplace_items:item_id (sub_category)')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .gte('purchased_at', todayStart.toISOString())
    .lte('purchased_at', todayEnd.toISOString());

  if (error || !data) {
    return { hasActiveTokens: false, extraMessagesRemaining: 0, purchaseId: null };
  }

  const hintTokens = (data as Array<Record<string, unknown>>).filter((row) => {
    const item = row.marketplace_items as Record<string, unknown> | null;
    return item?.sub_category === 'hint_token';
  });

  if (hintTokens.length === 0) {
    return { hasActiveTokens: false, extraMessagesRemaining: 0, purchaseId: null };
  }

  // Each hint token pack provides 5 extra messages
  // Check metadata for used count
  const totalExtra = hintTokens.length * 5;
  const usedCount = hintTokens.reduce((sum, token) => {
    const meta = token.metadata as Record<string, unknown> | null;
    return sum + ((meta?.messages_used as number) ?? 0);
  }, 0);

  const remaining = Math.max(0, totalExtra - usedCount);
  const firstActiveToken = hintTokens[0];

  return {
    hasActiveTokens: remaining > 0,
    extraMessagesRemaining: remaining,
    purchaseId: firstActiveToken ? (firstActiveToken.id as string) : null,
  };
}

/**
 * Pure function: determines if a student can send an AI Tutor message.
 * Checks base daily limit first, then falls back to hint tokens.
 */
export function canSendTutorMessage(
  baseMessagesUsed: number,
  baseDailyLimit: number,
  hintTokenStatus: HintTokenStatus,
): { allowed: boolean; usingHintToken: boolean; remainingMessages: number } {
  const baseRemaining = Math.max(0, baseDailyLimit - baseMessagesUsed);

  if (baseRemaining > 0) {
    return {
      allowed: true,
      usingHintToken: false,
      remainingMessages: baseRemaining + hintTokenStatus.extraMessagesRemaining,
    };
  }

  if (hintTokenStatus.hasActiveTokens) {
    return {
      allowed: true,
      usingHintToken: true,
      remainingMessages: hintTokenStatus.extraMessagesRemaining,
    };
  }

  return {
    allowed: false,
    usingHintToken: false,
    remainingMessages: 0,
  };
}
