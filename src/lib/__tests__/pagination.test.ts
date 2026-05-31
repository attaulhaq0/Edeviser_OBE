import { describe, it, expect } from "vitest";
import { toRange, hasMore, pageCount } from "../pagination";

describe("pagination", () => {
  describe("toRange", () => {
    it("returns the inclusive zero-based range for the first page", () => {
      expect(toRange(1, 50)).toEqual({ from: 0, to: 49 });
    });

    it("advances the range by pageSize for later pages", () => {
      expect(toRange(2, 50)).toEqual({ from: 50, to: 99 });
      expect(toRange(3, 25)).toEqual({ from: 50, to: 74 });
    });

    it("spans exactly pageSize indices (Supabase .range convention)", () => {
      const { from, to } = toRange(4, 20);
      expect(to - from + 1).toBe(20);
    });

    it("clamps page numbers below 1 to the first page", () => {
      expect(toRange(0, 10)).toEqual({ from: 0, to: 9 });
      expect(toRange(-5, 10)).toEqual({ from: 0, to: 9 });
    });

    it("clamps a page size below 1 to a single row", () => {
      expect(toRange(1, 0)).toEqual({ from: 0, to: 0 });
      expect(toRange(2, -3)).toEqual({ from: 1, to: 1 });
    });

    it("floors fractional inputs to stay on integer boundaries", () => {
      expect(toRange(2.9, 10.7)).toEqual({ from: 10, to: 19 });
    });

    it("treats non-finite inputs as the first page / single row", () => {
      expect(toRange(Number.NaN, 10)).toEqual({ from: 0, to: 9 });
      expect(toRange(2, Number.POSITIVE_INFINITY)).toEqual({ from: 1, to: 1 });
    });
  });

  describe("pageCount", () => {
    it("computes the exact ceiling number of pages", () => {
      expect(pageCount(100, 50)).toBe(2);
      expect(pageCount(101, 50)).toBe(3);
      expect(pageCount(49, 50)).toBe(1);
    });

    it("returns 0 pages for an empty collection", () => {
      expect(pageCount(0, 50)).toBe(0);
    });

    it("clamps a page size below 1 to a single row", () => {
      expect(pageCount(3, 0)).toBe(3);
    });

    it("treats a negative total as empty", () => {
      expect(pageCount(-10, 50)).toBe(0);
    });
  });

  describe("hasMore", () => {
    it("is true when further rows exist beyond the page", () => {
      expect(hasMore(1, 50, 120)).toBe(true);
      expect(hasMore(2, 50, 120)).toBe(true);
    });

    it("is false on the final page", () => {
      expect(hasMore(3, 50, 120)).toBe(false);
    });

    it("is false when the page exactly consumes all rows", () => {
      expect(hasMore(2, 50, 100)).toBe(false);
    });

    it("is false for an empty collection", () => {
      expect(hasMore(1, 50, 0)).toBe(false);
    });

    it("agrees with pageCount: hasMore iff page < pageCount", () => {
      const total = 137;
      const pageSize = 25;
      const pages = pageCount(total, pageSize);
      for (let page = 1; page <= pages; page++) {
        expect(hasMore(page, pageSize, total)).toBe(page < pages);
      }
    });
  });
});
