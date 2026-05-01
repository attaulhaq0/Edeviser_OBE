// Feature: i18n-rtl-support, Property 5: Bilingual Content Resolver Fallback
// **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  resolveBilingualContent,
  createBilingualField,
} from "@/lib/bilingualContent";

const nonEmptyStringArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());
const langArb = fc.constantFrom("en", "ar");

describe("Property 5 — Bilingual content resolver returns non-empty string when at least one language provided", () => {
  it("P5a: returns non-empty when at least one language is provided", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.record({ en: nonEmptyStringArb, ar: fc.constant(null) }),
          fc.record({ en: fc.constant(null), ar: nonEmptyStringArb }),
          fc.record({ en: nonEmptyStringArb, ar: nonEmptyStringArb })
        ),
        langArb,
        (field, lang) => {
          const result = resolveBilingualContent(field, lang);
          expect(result.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P5b: returns active language version when both are provided", () => {
    fc.assert(
      fc.property(
        nonEmptyStringArb,
        nonEmptyStringArb,
        langArb,
        (en, ar, lang) => {
          const field = createBilingualField(en, ar);
          const result = resolveBilingualContent(field, lang);
          if (lang === "en") {
            expect(result).toBe(en);
          } else {
            expect(result).toBe(ar);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P5c: falls back to other language when active language is empty", () => {
    fc.assert(
      fc.property(nonEmptyStringArb, (text) => {
        // Only English provided, requesting Arabic → falls back to English
        const enOnly = createBilingualField(text, null);
        expect(resolveBilingualContent(enOnly, "ar")).toBe(text);

        // Only Arabic provided, requesting English → falls back to Arabic
        const arOnly = createBilingualField(null, text);
        expect(resolveBilingualContent(arOnly, "en")).toBe(text);
      }),
      { numRuns: 100 }
    );
  });

  it("P5d: returns empty string when both are empty", () => {
    fc.assert(
      fc.property(langArb, (lang) => {
        const empty = createBilingualField(null, null);
        expect(resolveBilingualContent(empty, lang)).toBe("");
      }),
      { numRuns: 100 }
    );
  });
});
