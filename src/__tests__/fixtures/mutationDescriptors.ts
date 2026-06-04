/**
 * Mutation descriptor registry for the Schema_Contract_Test (Part C, Req 18).
 *
 * Each entry names a table and the keys a hook sends in its insert/upsert
 * payload. The registry is the single, table-driven source the contract test
 * iterates over (Req 18.5/18.6): adding coverage for a new RLS-protected
 * mutation is one array entry — no test code changes.
 *
 * Seeded minimally with the challenge and team creators, whose
 * `*_INSERT_COLUMNS` constants already exist and are compile-time-proven to be
 * real `Insert` columns (`as const satisfies readonly InsertKeys<T>[]` in
 * `src/lib/db/insertColumns.ts`). Later tasks append more descriptors:
 *   • 9.6  → `sendTeacherNudge → notifications`
 *   • 10.4 → (re)confirm `useCreateChallenge → social_challenges`
 *   • 11.4 → (re)confirm `useCreateTeam → teams`
 */
import type { Database } from "@/types/database";
import {
  SOCIAL_CHALLENGES_INSERT_COLUMNS,
  TEAMS_INSERT_COLUMNS,
} from "@/lib/db/insertColumns";

/**
 * Describes one hook's insert/upsert payload contract. `table` is constrained
 * to a real public table name so a typo or removed table fails `tsc`.
 */
export interface MutationDescriptor {
  /** Hook name, used in error messages, e.g. `"useCreateTeam"`. */
  hook: string;
  /** Target public table the payload is written to. */
  table: keyof Database["public"]["Tables"];
  /** The keys the hook sends in its insert/upsert payload. */
  payloadKeys: readonly string[];
  /** The mutation operation. */
  op: "insert" | "upsert";
}

/**
 * The extensible registry consumed by `schemaContract.test.ts`. One entry per
 * RLS-protected mutation hook.
 */
export const MUTATION_DESCRIPTORS: readonly MutationDescriptor[] = [
  {
    hook: "useCreateChallenge",
    table: "social_challenges",
    payloadKeys: [...SOCIAL_CHALLENGES_INSERT_COLUMNS],
    op: "insert",
  },
  {
    hook: "useCreateTeam",
    table: "teams",
    payloadKeys: [...TEAMS_INSERT_COLUMNS],
    op: "insert",
  },
  {
    // Nudge is written by the `send_teacher_nudge` SECURITY DEFINER RPC, which
    // inserts a `notifications` row. These are the keys that RPC sets.
    hook: "sendTeacherNudge",
    table: "notifications",
    payloadKeys: ["user_id", "type", "title", "body", "is_read"],
    op: "insert",
  },
  // extensible: add one line per RLS-protected mutation (Req 18.6).
];
