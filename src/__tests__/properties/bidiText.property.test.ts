// Feature: i18n-rtl-support, Property 9: LTR/RTL Isolate Round-Trip
// **Validates: Requirements 12.1, 12.2, 12.4**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { ltrIsolate, rtlIsolate, startsWithRTL } from "@/lib/bidiText";

const LRI = "\u2066"; // Left-to-Right Isolate
const RLI = "\u2067"; // Right-to-Left Isolate
const PDI = "\u2069"; // Pop Directional Isolate

/**
 * Strips Unicode isolate characters from a string.
 */
function stripIsolateChars(s: string): string {
  return s.replace(/[\u2066\u2067\u2069]/g, "");
}

const textArb = fc.string({ minLength: 0, maxLength: 200 });

describe("Property 9 — LTR/RTL isolate round-trip", () => {
  it("P9a: stripping isolate chars from ltrIsolate returns original string", () => {
    fc.assert(
      fc.property(textArb, (text) => {
        const isolated = ltrIsolate(text);
        const stripped = stripIsolateChars(isolated);
        expect(stripped).toBe(stripIsolateChars(text));
      }),
      { numRuns: 100 }
    );
  });

  it("P9b: stripping isolate chars from rtlIsolate returns original string", () => {
    fc.assert(
      fc.property(textArb, (text) => {
        const isolated = rtlIsolate(text);
        const stripped = stripIsolateChars(isolated);
        expect(stripped).toBe(stripIsolateChars(text));
      }),
      { numRuns: 100 }
    );
  });

  it("P9c: ltrIsolate wraps with correct Unicode characters", () => {
    fc.assert(
      fc.property(textArb, (text) => {
        const result = ltrIsolate(text);
        expect(result.startsWith(LRI)).toBe(true);
        expect(result.endsWith(PDI)).toBe(true);
        expect(result).toBe(`${LRI}${text}${PDI}`);
      }),
      { numRuns: 100 }
    );
  });

  it("P9d: rtlIsolate wraps with correct Unicode characters", () => {
    fc.assert(
      fc.property(textArb, (text) => {
        const result = rtlIsolate(text);
        expect(result.startsWith(RLI)).toBe(true);
        expect(result.endsWith(PDI)).toBe(true);
        expect(result).toBe(`${RLI}${text}${PDI}`);
      }),
      { numRuns: 100 }
    );
  });

  it("P9e: startsWithRTL returns boolean for any string", () => {
    fc.assert(
      fc.property(textArb, (text) => {
        const result = startsWithRTL(text);
        expect(typeof result).toBe("boolean");
      }),
      { numRuns: 100 }
    );
  });
});
