// Replacement Vote Zod schema for the Team Challenges feature.
// Validates vote initiation inputs.

import { z } from "zod";

export const initiateReplacementVoteSchema = z.object({
  team_id: z.string().uuid("Invalid team ID"),
  target_member_id: z.string().uuid("Invalid target member ID"),
});

export type InitiateReplacementVoteInput = z.infer<
  typeof initiateReplacementVoteSchema
>;
