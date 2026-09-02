// Feature: E1.7 sort-order input hardening (platform-hardening-and-integration).
// Raw number inputs submit "" / NaN / negative values; the shared schema must
// normalize them and always emit friendly messages instead of Zod defaults
// ("Invalid input: expected number, received NaN").
import { describe, expect, it } from "vitest";
import {
  normalizeSortOrderInput,
  sortOrderSchema,
} from "@/lib/schemas/sortOrder";

describe("sortOrderSchema + normalizeSortOrderInput (E1.7)", () => {
  it("accepts valid non-negative integers", () => {
    expect(sortOrderSchema.parse(3)).toBe(3);
    expect(sortOrderSchema.parse(0)).toBe(0);
  });

  it("normalizes raw input values at the boundary", () => {
    expect(normalizeSortOrderInput("")).toBe(0);
    expect(normalizeSortOrderInput(null)).toBe(0);
    expect(normalizeSortOrderInput(undefined)).toBe(0);
    expect(normalizeSortOrderInput(Number.NaN)).toBe(0);
    expect(normalizeSortOrderInput("abc")).toBe(0);
    expect(normalizeSortOrderInput("5")).toBe(5);
    expect(normalizeSortOrderInput(7)).toBe(7);
  });

  it("rejects negative integers with a friendly message", () => {
    const result = sortOrderSchema.safeParse(-1);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Sort order cannot be negative"
      );
    }
  });

  it("rejects non-integers with a friendly message", () => {
    const result = sortOrderSchema.safeParse(1.5);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Sort order must be a whole number"
      );
    }
  });

  it("never surfaces Zod's default 'Invalid input' message", () => {
    for (const bad of [-3, 2.5, Number.NaN]) {
      const result = sortOrderSchema.safeParse(bad);
      if (!result.success) {
        for (const issue of result.error.issues) {
          expect(issue.message.startsWith("Invalid input")).toBe(false);
        }
      }
    }
  });
});
