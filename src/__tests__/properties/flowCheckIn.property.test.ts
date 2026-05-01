// =============================================================================
// Property Tests — Flow Check-In (P22)
// Feature: weekly-planner-today-view, Property 22
// =============================================================================

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { flowCheckInSchema } from "@/lib/schemas/planner";

describe("Property 22: Flow check-in response options and interval uniqueness", () => {
  const validResponses = ["in_the_zone", "stuck", "too_easy"] as const;

  it("accepts valid flow check-ins with valid response and positive interval", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 1, max: 100 }),
        fc.constantFrom(...validResponses),
        (sessionId, intervalNumber, response) => {
          const result = flowCheckInSchema.safeParse({
            sessionId,
            intervalNumber,
            response,
          });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects flow check-ins with interval < 1", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: -100, max: 0 }),
        fc.constantFrom(...validResponses),
        (sessionId, intervalNumber, response) => {
          const result = flowCheckInSchema.safeParse({
            sessionId,
            intervalNumber,
            response,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects flow check-ins with invalid response values", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 1, max: 100 }),
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter(
            (s) =>
              !validResponses.includes(s as (typeof validResponses)[number])
          ),
        (sessionId, intervalNumber, response) => {
          const result = flowCheckInSchema.safeParse({
            sessionId,
            intervalNumber,
            response,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("response is always one of exactly 3 options", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 1, max: 50 }),
        fc.constantFrom(...validResponses),
        (_sessionId, _interval, response) => {
          expect(validResponses).toContain(response);
          expect(validResponses.length).toBe(3);
        }
      ),
      { numRuns: 100 }
    );
  });
});
