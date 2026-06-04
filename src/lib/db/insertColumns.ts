/**
 * Per-table allowed-column constants for database insert payloads.
 *
 * Each constant lists exactly the columns a hook is permitted to send to a
 * given table's `insert`, and is paired with {@link pickColumns} to strip any
 * UI-only or non-column fields before the call. The lists are tied to the
 * generated Supabase `Insert` types via `satisfies readonly InsertKeys<T>[]`,
 * so a renamed or removed column fails `tsc` at compile time rather than
 * surfacing as a runtime insert error.
 *
 * Keep these in lockstep with `src/types/database.ts` (regenerate types after
 * every migration with `pwsh scripts/regen-types.ps1`; never hand-edit the
 * generated file).
 */
import type { Database } from "@/types/database";

/** The union of valid `Insert` keys for a public table `T`. */
type InsertKeys<T extends keyof Database["public"]["Tables"]> =
  keyof Database["public"]["Tables"][T]["Insert"];

/**
 * Columns accepted by `social_challenges.insert`.
 *
 * Notably excludes the UI-only `xp_race_acknowledged` field (it is not a real
 * column) so the acknowledgment gate stays entirely client-side.
 */
export const SOCIAL_CHALLENGES_INSERT_COLUMNS = [
  "course_id",
  "institution_id",
  "created_by",
  "title",
  "description",
  "challenge_type",
  "participation_mode",
  "goal_target",
  "start_date",
  "end_date",
  "reward_xp",
  "reward_badge_id",
  "status",
] as const satisfies readonly InsertKeys<"social_challenges">[];

/** Columns accepted by `teams.insert` (covers all required NOT NULL columns). */
export const TEAMS_INSERT_COLUMNS = [
  "name",
  "course_id",
  "institution_id",
  "captain_id",
  "created_by",
  "avatar_letter",
] as const satisfies readonly InsertKeys<"teams">[];
