// =============================================================================
// Property tests — mascot guidance non-blocking invariants (R35)
// =============================================================================
//
// These properties guard the two safety invariants that keep the optional
// mascot strictly additive:
//   • R35.4 — disabled ⇒ never any guidance.
//   • R35.5 — no active moment ⇒ never any guidance; and when enabled with an
//     active known moment, the resolved descriptor is internally consistent.
//
// R35 has no numbered design Correctness Property; these fast-check checks
// exercise the pure resolver across its full input space rather than adding a
// new named design property.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  resolveMascotGuidance,
  MASCOT_MOMENTS,
  MASCOT_MOMENT_IDS,
  type MascotMomentId,
} from "@/lib/mascotGuidance";

const momentArb: fc.Arbitrary<MascotMomentId | null> = fc.constantFrom(
  ...MASCOT_MOMENT_IDS,
  null
);

describe("mascotGuidance.property", () => {
  it("never produces guidance while disabled, for any moment (R35.4)", () => {
    fc.assert(
      fc.property(momentArb, (moment) => {
        expect(resolveMascotGuidance({ enabled: false, moment })).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it("never produces guidance when no moment is active, regardless of enablement (R35.5)", () => {
    fc.assert(
      fc.property(fc.boolean(), (enabled) => {
        expect(resolveMascotGuidance({ enabled, moment: null })).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it("produces a consistent descriptor exactly when enabled and a known moment is active", () => {
    fc.assert(
      fc.property(fc.boolean(), momentArb, (enabled, moment) => {
        const guidance = resolveMascotGuidance({ enabled, moment });
        const shouldShow = enabled && moment !== null;
        expect(guidance !== null).toBe(shouldShow);
        if (guidance !== null && moment !== null) {
          expect(guidance.moment).toBe(moment);
          expect(guidance.i18nKey).toBe(MASCOT_MOMENTS[moment].i18nKey);
          expect(guidance.tone).toBe(MASCOT_MOMENTS[moment].tone);
        }
      }),
      { numRuns: 100 }
    );
  });
});
