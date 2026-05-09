// supabase/functions/audit-fixtures/schemas.ts
//
// Zod schemas for every audit-fixtures request body. Req 13.4 requires that
// every Edge Function validate its request body against a Zod schema before
// any side effect; safeParse is called before any service-role write.
//
// Using zod via esm.sh keeps Deno happy — no npm install at runtime.

import { z } from "https://esm.sh/zod@3.23.8";

export const USER_ROLES = [
  "admin",
  "coordinator",
  "teacher",
  "student",
  "parent",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

// ─── /seed ─────────────────────────────────────────────────────────────────

export const SeedRequestSchema = z.object({
  // The per-run id is mandatory so teardown can match rows deterministically.
  runId: z.string().uuid(),
  // Optional: when present, the seed endpoint upserts only the listed roles.
  // Empty/omitted means "provision every seed role".
  roles: z
    .array(z.enum(USER_ROLES))
    .optional()
    .default([...USER_ROLES]),
});

export type SeedRequest = z.infer<typeof SeedRequestSchema>;

// ─── /teardown ─────────────────────────────────────────────────────────────

export const TeardownRequestSchema = z.object({
  runId: z.string().uuid(),
});

export type TeardownRequest = z.infer<typeof TeardownRequestSchema>;

// ─── /impersonate ──────────────────────────────────────────────────────────

export const ImpersonateRequestSchema = z.object({
  role: z.enum(USER_ROLES),
  // Parent needs a linked/unlinked selector since we provision two parents.
  variant: z
    .enum(["default", "linked", "unlinked"])
    .optional()
    .default("default"),
});

export type ImpersonateRequest = z.infer<typeof ImpersonateRequestSchema>;

// ─── /event/bonus-xp ───────────────────────────────────────────────────────

export const BonusXpEventRequestSchema = z
  .object({
    // Keep multipliers within a sane range so a misconfigured test cannot
    // accidentally inflate real XP by a huge factor. Real bonus events in
    // production are typically 1.5x–3x.
    multiplier: z.number().gt(1).lte(10),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
  })
  .refine(
    (v) => new Date(v.endsAt).getTime() > new Date(v.startsAt).getTime(),
    { message: "endsAt must be after startsAt", path: ["endsAt"] }
  );

export type BonusXpEventRequest = z.infer<typeof BonusXpEventRequestSchema>;
