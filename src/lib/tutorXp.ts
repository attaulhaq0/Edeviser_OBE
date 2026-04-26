// ─── Tutor XP Award Utilities ───────────────────────────────────────────────
//
// Pure functions for computing tutor engagement XP awards.
// Used by the chat-with-tutor Edge Function and award-xp Edge Function.

// ─── Constants ──────────────────────────────────────────────────────────────

/** Minimum student messages in a conversation before XP is awarded. */
export const TUTOR_XP_MESSAGE_THRESHOLD = 3;

/** XP amount for tutor engagement. */
export const TUTOR_ENGAGEMENT_XP = 15;

/** XP amount per satisfaction rating. */
export const RATING_XP = 5;

/** Maximum rating XP awards per day. */
export const MAX_RATING_XP_PER_DAY = 3;

// ─── XP Award Logic ─────────────────────────────────────────────────────────

/**
 * Determines whether a tutor engagement XP award should be given.
 *
 * XP is awarded when:
 * - The student has sent at least 3 messages in the conversation
 * - XP has not already been awarded for this conversation
 *
 * @returns The XP amount to award (0 if not eligible).
 */
export function computeTutorEngagementXP(
  studentMessageCount: number,
  xpAlreadyAwarded: boolean,
): number {
  if (xpAlreadyAwarded) return 0;
  if (studentMessageCount < TUTOR_XP_MESSAGE_THRESHOLD) return 0;
  return TUTOR_ENGAGEMENT_XP;
}

/**
 * Determines whether a rating XP award should be given.
 *
 * XP is awarded when:
 * - The student has given fewer than 3 ratings today
 *
 * @returns The XP amount to award (0 if capped).
 */
export function computeRatingXP(ratingXPCountToday: number): number {
  if (ratingXPCountToday >= MAX_RATING_XP_PER_DAY) return 0;
  return RATING_XP;
}
