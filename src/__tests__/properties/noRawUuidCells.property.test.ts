// Feature: qa-partner-review-remediation, Property 4 (no raw UUID in resolved name cells)
// **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.6, 5.7**
//
// Property 4 (design.md): *For any* row in the Admin Courses, Teacher CLOs,
// Teacher Rubrics, or Teacher Assignments tables — including rows whose embedded
// relation name is missing or null — the value rendered in a cell intended to
// show a name or title SHALL never be a Raw_UUID; it SHALL be either a resolved
// human-readable name or the defined fallback label.
//
// This test runs against the REAL shared helper `resolveName`
// (src/lib/db/resolveName.ts) — it is NOT mocked. `resolveName` is the single
// code path every name/title cell renders through (Req 5.6): once a list query
// embeds the related row, the column renders `resolveName(row.relation?.name)`.
//
// The invariant under test is the no-raw-UUID correctness property (Req 5.7):
// the output is NEVER a bare UUID. An INDEPENDENT UUID-detection regex acts as
// the oracle so a leaked identifier cannot slip through, and an independent
// re-derivation of the expected value verifies both branches (resolved name vs.
// fallback) are exercised and exact.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { resolveName } from "@/lib/db/resolveName";

// ── Oracle: bare-UUID detector (8-4-4-4-12 hex, anchored, case-insensitive) ───
// Defined independently of the implementation; a name cell must never match it.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The default fallback label `resolveName` returns when no displayable name
// exists (em dash). Mirrors the helper's default `fallback` parameter.
const FALLBACK = "—";

// ── Generators ────────────────────────────────────────────────────────────────
// Human-readable, non-blank, non-UUID display names. Built from a hyphen-free
// alphanumeric alphabet (so a generated token can never accidentally be a UUID)
// plus a handful of realistic labels — no filtering needed.
const safeCharArb = fc.constantFrom(
  ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("")
);

const humanNameArb: fc.Arbitrary<string> = fc.oneof(
  fc.constantFrom(
    "Intro to Programming",
    "Data Structures",
    "Dr. Sarah Lee",
    "Calculus I",
    "Ms. Aisha Khan"
  ),
  fc
    .array(safeCharArb, { minLength: 1, maxLength: 16 })
    .map((chars) => chars.join(""))
);

// The shapes a name/title cell value can take, mixed via `fc.oneof` so BOTH the
// resolved-name branch and the fallback branch are exercised frequently:
//   - a resolved human-readable name (non-UUID string)
//   - null / undefined (relation could not be resolved)
//   - an empty string / whitespace-only embedded name
//   - a Raw_UUID that leaked through (fc.uuid())
const cellInputArb: fc.Arbitrary<string | null | undefined> = fc.oneof(
  humanNameArb,
  fc.constant<string | null | undefined>(null),
  fc.constant<string | null | undefined>(undefined),
  fc.constant(""),
  fc.constantFrom(" ", "   ", "\t"),
  fc.uuid()
);

// ── Name-cell model: relation may be missing/null (design instruction) ────────
// Mirrors how the columns render: `resolveName(row.relation?.name ?? null)`,
// where the embedded relation itself may be absent (undefined), null, or carry a
// missing/blank/leaked name.
type EmbeddedRelation = { name: string | null } | null | undefined;

const relationArb: fc.Arbitrary<EmbeddedRelation> = fc.oneof(
  fc.constant<EmbeddedRelation>(undefined), // relation key absent
  fc.constant<EmbeddedRelation>(null), // relation present but null
  humanNameArb.map<EmbeddedRelation>((name) => ({ name })), // resolved name
  fc.constant<EmbeddedRelation>({ name: null }), // null embedded name
  fc.constant<EmbeddedRelation>({ name: "" }), // empty embedded name
  fc.constantFrom(" ", "   ", "\t").map<EmbeddedRelation>((name) => ({ name })),
  fc.uuid().map<EmbeddedRelation>((name) => ({ name })) // raw UUID in name
);

const renderNameCell = (relation: EmbeddedRelation): string =>
  resolveName(relation?.name ?? null);

// Independent re-derivation of the expected cell value (oracle for exactness):
// a non-blank, non-UUID string renders trimmed; everything else renders the
// fallback label.
const expectedCell = (value: string | null | undefined): string => {
  if (value === null || value === undefined) return FALLBACK;
  const trimmed = value.trim();
  if (trimmed === "" || UUID_RE.test(trimmed)) return FALLBACK;
  return trimmed;
};

describe("Property 4 — no raw UUID in resolved name cells (real resolveName)", () => {
  it("never renders a Raw_UUID for any cell input; returns a human name or the fallback", () => {
    fc.assert(
      fc.property(cellInputArb, (value) => {
        const cell = resolveName(value);

        // Core invariant (Req 5.7): the rendered cell is NEVER a bare UUID.
        expect(UUID_RE.test(cell)).toBe(false);

        // Exactness: resolved-name branch returns the trimmed name; the
        // missing/null/undefined/empty/UUID branches return the fallback.
        expect(cell).toBe(expectedCell(value));
      }),
      { numRuns: 300 }
    );
  });

  it("models the name-cell path `resolveName(relation?.name ?? null)` with a possibly-missing relation", () => {
    fc.assert(
      fc.property(relationArb, (relation) => {
        const cell = renderNameCell(relation);

        // Never a raw identifier, even when the embedded relation is absent,
        // null, or carries a leaked UUID (Req 5.1–5.4, 5.7).
        expect(UUID_RE.test(cell)).toBe(false);

        const name = relation?.name ?? null;
        if (name !== null && name.trim() !== "" && !UUID_RE.test(name.trim())) {
          // Embedded relation name is present → the resolved name is rendered.
          expect(cell).toBe(name.trim());
        } else {
          // Missing/null/blank/UUID embedded name → the fallback label (Req 5.6).
          expect(cell).toBe(FALLBACK);
        }
      }),
      { numRuns: 200 }
    );
  });

  it("maps every generated bare UUID to the fallback, never surfacing the id", () => {
    fc.assert(
      fc.property(fc.uuid(), (id) => {
        expect(resolveName(id)).toBe(FALLBACK);
        expect(UUID_RE.test(resolveName(id))).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("preserves a human label that merely contains a UUID (not a bare id)", () => {
    fc.assert(
      fc.property(fc.uuid(), (id) => {
        // A display string that contains a UUID is still human-readable and is
        // left intact (the regex is anchored to a *bare* UUID).
        const label = `Cohort ${id}`;
        const cell = resolveName(label);
        expect(cell).toBe(label);
        expect(UUID_RE.test(cell)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
