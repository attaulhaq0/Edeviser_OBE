// Feature: student-experience-remediation, Property 10: Tutor status mapping is total and correct
// **Validates: Requirements 4.2, 4.3**
//
// For any backend signal (any combination of HTTP status, SSE error code, or
// network-error flag, including unknown/unrecognized values), `mapTutorError`
// returns a defined `TutorUiState`. Documented inputs map to the correct kinds:
//   - network failure / 500 / 502 / 503 -> "unavailable"
//   - 403                                -> "not_enrolled"
//   - 429                                -> "rate_limited"
//   - 2xx                                -> "ready"
//   - unrecognized / detection-failure   -> guaranteed "error" fallback

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  mapTutorError,
  type TutorSignal,
  type TutorUiState,
} from "@/lib/tutorStatus";

// ─── The complete set of defined UI-state kinds ─────────────────────────────

const ALL_KINDS = [
  "ready",
  "unavailable",
  "not_enrolled",
  "no_embeddings",
  "rate_limited",
  "error",
] as const satisfies readonly TutorUiState["kind"][];

const KIND_SET = new Set<string>(ALL_KINDS);

// Codes the mapper recognizes (mirrors the implementation's documented inputs).
const RATE_LIMITED_CODES = ["rate_limit_exceeded", "token_budget_exceeded"];
const UNAVAILABLE_CODES = [
  "embedding_error",
  "llm_error",
  "llm_unavailable",
  "no_stream",
];
const NO_EMBEDDINGS_CODES = ["no_embeddings"];
const RECOGNIZED_CODES = [
  ...RATE_LIMITED_CODES,
  ...UNAVAILABLE_CODES,
  ...NO_EMBEDDINGS_CODES,
];

// ─── Arbitraries ────────────────────────────────────────────────────────────

// Arbitrary HTTP status spanning real-world ranges plus out-of-band values.
const httpStatusArb = fc.oneof(
  fc.integer({ min: 100, max: 599 }),
  fc.constantFrom(200, 201, 204, 400, 401, 403, 404, 429, 500, 502, 503),
  fc.integer({ min: -1000, max: 100000 }) // nonsensical statuses must still be total
);

// Arbitrary code: a mix of recognized codes, arbitrary strings, and noise.
const codeArb = fc.oneof(
  fc.constantFrom(...RECOGNIZED_CODES),
  // recognized codes with random casing (mapper compares case-insensitively)
  fc.constantFrom(...RECOGNIZED_CODES).map((c) => c.toUpperCase()),
  fc.string(),
  fc.string({ minLength: 1, maxLength: 40 })
);

// Fully arbitrary signal — every field independently present or absent, so the
// generator covers empty signals, partial signals, and contradictory ones.
const arbitrarySignal: fc.Arbitrary<TutorSignal> = fc.record(
  {
    httpStatus: httpStatusArb,
    code: codeArb,
    networkError: fc.boolean(),
    resetHint: fc.string(),
    message: fc.string(),
  },
  { requiredKeys: [] } // any subset of keys may be present (including none)
);

// ─── Property 10a: Totality ─────────────────────────────────────────────────

describe("Property 10 — Tutor status mapping is total", () => {
  it("returns a defined TutorUiState kind for any arbitrary signal", () => {
    fc.assert(
      fc.property(arbitrarySignal, (signal) => {
        const state = mapTutorError(signal);
        expect(state).toBeDefined();
        expect(KIND_SET.has(state.kind)).toBe(true);
        // The guaranteed fallback always carries a non-empty message.
        if (state.kind === "error") {
          expect(typeof state.message).toBe("string");
          expect(state.message.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 300 }
    );
  });

  it("returns the guaranteed error fallback for the empty signal", () => {
    const state = mapTutorError({});
    expect(state.kind).toBe("error");
  });
});

// ─── Property 10b: Documented inputs map to the correct kinds ───────────────

describe("Property 10 — documented inputs map to the correct kinds", () => {
  it("network failure always maps to unavailable, regardless of other fields", () => {
    fc.assert(
      fc.property(
        fc.record(
          {
            httpStatus: httpStatusArb,
            code: codeArb,
            resetHint: fc.string(),
            message: fc.string(),
          },
          { requiredKeys: [] }
        ),
        (rest) => {
          const state = mapTutorError({ ...rest, networkError: true });
          expect(state.kind).toBe("unavailable");
        }
      ),
      { numRuns: 200 }
    );
  });

  it("403 (no network error, no recognized code) maps to not_enrolled", () => {
    fc.assert(
      fc.property(
        fc.option(fc.string(), { nil: undefined }),
        fc.option(fc.string(), { nil: undefined }),
        (message, resetHint) => {
          const state = mapTutorError({
            httpStatus: 403,
            message,
            resetHint,
          });
          expect(state.kind).toBe("not_enrolled");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("429 (no network error, no recognized code) maps to rate_limited", () => {
    fc.assert(
      fc.property(fc.option(fc.string(), { nil: undefined }), (resetHint) => {
        const state = mapTutorError({ httpStatus: 429, resetHint });
        expect(state.kind).toBe("rate_limited");
      }),
      { numRuns: 100 }
    );
  });

  it("500 / 502 / 503 (no network error, no recognized code) map to unavailable", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(500, 502, 503),
        fc.option(fc.string(), { nil: undefined }),
        (status, message) => {
          const state = mapTutorError({ httpStatus: status, message });
          expect(state.kind).toBe("unavailable");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("any 2xx status (no network error, no recognized code) maps to ready", () => {
    fc.assert(
      fc.property(fc.integer({ min: 200, max: 299 }), (status) => {
        const state = mapTutorError({ httpStatus: status });
        expect(state.kind).toBe("ready");
      }),
      { numRuns: 100 }
    );
  });

  it("recognized rate-limit codes map to rate_limited (case-insensitive, any status)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...RATE_LIMITED_CODES),
        fc.boolean(),
        httpStatusArb,
        (code, upper, status) => {
          const state = mapTutorError({
            code: upper ? code.toUpperCase() : code,
            httpStatus: status,
          });
          expect(state.kind).toBe("rate_limited");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("recognized unavailable codes map to unavailable (case-insensitive, any status)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...UNAVAILABLE_CODES),
        fc.boolean(),
        httpStatusArb,
        (code, upper, status) => {
          const state = mapTutorError({
            code: upper ? code.toUpperCase() : code,
            httpStatus: status,
          });
          expect(state.kind).toBe("unavailable");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("the no_embeddings code maps to no_embeddings (case-insensitive, any status)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...NO_EMBEDDINGS_CODES),
        fc.boolean(),
        httpStatusArb,
        (code, upper, status) => {
          const state = mapTutorError({
            code: upper ? code.toUpperCase() : code,
            httpStatus: status,
          });
          expect(state.kind).toBe("no_embeddings");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("unrecognized signals (unknown status, unknown/no code, no network error) map to the error fallback", () => {
    // Statuses the mapper does not assign a specific state to, with codes that
    // are never in the recognized set.
    const unmappedStatusArb = fc
      .integer({ min: -100, max: 100000 })
      .filter(
        (s) =>
          !(s >= 200 && s < 300) &&
          s !== 403 &&
          s !== 429 &&
          s !== 500 &&
          s !== 502 &&
          s !== 503
      );
    const unrecognizedCodeArb = fc
      .string()
      .filter((c) => !RECOGNIZED_CODES.includes(c.toLowerCase()));

    fc.assert(
      fc.property(
        fc.option(unmappedStatusArb, { nil: undefined }),
        fc.option(unrecognizedCodeArb, { nil: undefined }),
        (httpStatus, code) => {
          const state = mapTutorError({ httpStatus, code });
          expect(state.kind).toBe("error");
        }
      ),
      { numRuns: 200 }
    );
  });
});
