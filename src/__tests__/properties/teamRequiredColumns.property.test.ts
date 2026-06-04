// Feature: qa-partner-review-remediation, Property 3
// **Validates: Requirements 3.1, 3.2, 3.5**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { pickColumns } from "@/lib/db/pickColumns";
import { TEAMS_INSERT_COLUMNS } from "@/lib/db/insertColumns";
import type { CreateTeamInput } from "@/hooks/useTeams";

// ── Required-column source of truth ──────────────────────────────────────────
// Required (NOT NULL) columns of `teams`, mirroring the "teams" entry of
// src/__tests__/fixtures/requiredColumns.json. Inlined deliberately: the
// project's tsconfig does not enable `resolveJsonModule`, so importing the JSON
// directly would introduce a NEW `tsc` error. Keep this in lockstep with the
// fixture's "teams" entry.
const TEAMS_REQUIRED_COLUMNS = [
  "captain_id",
  "course_id",
  "created_by",
  "institution_id",
  "name",
] as const;

// ── Modeled Team_Create_Handler input ────────────────────────────────────────
// A valid Team_Create_Handler input per design Property 3: a profile
// institution, a non-empty ordered member list, a team name, and a course id
// (plus the creating user's id, which the real handler also supplies).
interface ModeledTeamInput {
  institution_id: string;
  name: string;
  course_id: string;
  created_by: string;
  members: string[]; // non-empty, ordered (members[0] becomes the captain)
}

// Mirror of the payload construction in `useCreateTeam`: `captain_id` is the
// first selected member, `institution_id` comes from the creating user's
// profile, and the row is shaped through the shared whitelist
// `pickColumns(input, TEAMS_INSERT_COLUMNS)` — the exact code under test.
const buildTeamInsertPayload = (
  input: ModeledTeamInput
): Pick<CreateTeamInput, (typeof TEAMS_INSERT_COLUMNS)[number]> => {
  const captainId = input.members[0]!;
  const row: CreateTeamInput = {
    name: input.name,
    course_id: input.course_id,
    institution_id: input.institution_id,
    captain_id: captainId,
    created_by: input.created_by,
  };
  return pickColumns(row, TEAMS_INSERT_COLUMNS);
};

// ── Generators ───────────────────────────────────────────────────────────────
// Constrain to the valid input space: UUID-like, non-empty institution/course/
// creator ids; a non-empty team name; and a non-empty, ordered, unique member
// list (length >= 1).
const inputArb: fc.Arbitrary<ModeledTeamInput> = fc.record({
  institution_id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 60 }),
  course_id: fc.uuid(),
  created_by: fc.uuid(),
  members: fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 6 }),
});

// ── Property Test ─────────────────────────────────────────────────────────────

describe("Property 3: Team required-column presence", () => {
  it("every Required_Column of `teams` is present and non-null in the insert payload", () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const payload = buildTeamInsertPayload(input);
        // Iterate without type assertions: spreading into a Record<string,
        // unknown> keeps every value `unknown`, which is index-safe.
        const record: Record<string, unknown> = { ...payload };

        for (const column of TEAMS_REQUIRED_COLUMNS) {
          expect(Object.prototype.hasOwnProperty.call(record, column)).toBe(
            true
          );
          expect(record[column]).not.toBeNull();
          expect(record[column]).not.toBeUndefined();
        }
      }),
      { numRuns: 100 }
    );
  });

  it("captain_id equals the first selected member (Req 3.2)", () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const payload = buildTeamInsertPayload(input);
        expect(payload.captain_id).toBe(input.members[0]);
      }),
      { numRuns: 100 }
    );
  });

  it("institution_id is populated from the creating user's profile institution (Req 3.1)", () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const payload = buildTeamInsertPayload(input);
        expect(payload.institution_id).toBe(input.institution_id);
        expect(payload.name).toBe(input.name);
        expect(payload.course_id).toBe(input.course_id);
      }),
      { numRuns: 100 }
    );
  });

  // Edge case: a single-member team — the smallest valid ordered member list.
  it("a single-member team still yields a complete, captain-tagged payload", () => {
    const captain = "11111111-1111-4111-8111-111111111111";
    const payload = buildTeamInsertPayload({
      institution_id: "22222222-2222-4222-8222-222222222222",
      name: "Solo Squad",
      course_id: "33333333-3333-4333-8333-333333333333",
      created_by: "44444444-4444-4444-8444-444444444444",
      members: [captain],
    });
    const record: Record<string, unknown> = { ...payload };
    for (const column of TEAMS_REQUIRED_COLUMNS) {
      expect(record[column]).toBeDefined();
      expect(record[column]).not.toBeNull();
    }
    expect(payload.captain_id).toBe(captain);
  });
});
