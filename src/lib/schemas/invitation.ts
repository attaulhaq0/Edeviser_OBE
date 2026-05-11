import { z } from "zod";

/**
 * Single invitation schema
 */
export const invitationSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum([
    "admin",
    "coordinator",
    "teacher",
    "student",
    "parent",
  ] as const),
  institution_id: z.string().uuid("Invalid institution ID"),
});

export type InvitationInput = z.infer<typeof invitationSchema>;

/**
 * Bulk invitation schema
 */
export const bulkInvitationSchema = z.object({
  institution_id: z.string().uuid("Invalid institution ID"),
  invites: z
    .array(
      z.object({
        email: z.string().email("Invalid email address"),
        role: z.enum([
          "admin",
          "coordinator",
          "teacher",
          "student",
          "parent",
        ] as const),
      })
    )
    .min(1, "At least one invitation is required"),
});

export type BulkInvitationInput = z.infer<typeof bulkInvitationSchema>;

/**
 * Invitation response schema (from database)
 */
export const invitationResponseSchema = z.object({
  id: z.string().uuid(),
  institution_id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum([
    "admin",
    "coordinator",
    "teacher",
    "student",
    "parent",
  ] as const),
  token: z.string(),
  expires_at: z.string().datetime(),
  used_at: z.string().datetime().nullable(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
});

export type InvitationResponse = z.infer<typeof invitationResponseSchema>;
