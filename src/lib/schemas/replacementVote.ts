// =============================================================================
// Replacement Vote Zod Schema — Task 1.27
// =============================================================================

import { z } from 'zod';

/** Schema for initiating a replacement vote (captain only, for inactive members) */
export const initiateReplacementVoteSchema = z.object({
  team_id: z.string().uuid('Invalid team ID'),
  target_member_id: z.string().uuid('Invalid member ID'),
});

export type InitiateReplacementVoteInput = z.infer<typeof initiateReplacementVoteSchema>;

/** Schema for casting a vote */
export const castVoteSchema = z.object({
  vote_id: z.string().uuid('Invalid vote ID'),
  vote: z.enum(['for', 'against']),
});

export type CastVoteInput = z.infer<typeof castVoteSchema>;

/** Vote resolution constants */
export const VOTE_CONSTANTS = {
  /** Hours before an open vote expires */
  EXPIRY_HOURS: 48,
  /** Days before a new vote can be initiated for the same member after a failed vote */
  COOLDOWN_DAYS: 7,
  /** Minimum percentage of active members (excluding target) needed to approve */
  APPROVAL_THRESHOLD: 0.5,
} as const;
