// Feature: student-experience-remediation, Property 4: Pagination is complete and never truncates
// **Validates: Requirements 32.2, 33.2, 33.3, 34.3**
//
// For any ordered source collection, any page size >= 1, and the full sequence of
// pages produced by the pagination helpers (`toRange`/`hasMore`), the concatenation
// of all pages in order reproduces the entire source collection exactly once -- with
// no missing entries, no duplicates, and no silent truncation -- and `hasMore` is
// true on a page if and only if at least one further item exists beyond that page.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { toRange, hasMore, pageCount } from "@/lib/pagination";

describe("pagination completeness property tests", () => {
  // An ordered source collection is modeled as the index sequence [0, total).
  // This is the most general ordered collection: any concrete collection of
  // `total` rows is recovered from its indices, so reproducing the indices
  // exactly once is equivalent to reproducing the rows exactly once.
  const totalArb = fc.integer({ min: 0, max: 1000 });
  const pageSizeArb = fc.integer({ min: 1, max: 200 });

  // Property 4 (completeness): paging through all pages with toRange covers
  // every index in [0, total) exactly once, in order, with no gaps or overlaps.
  it("covers every index in [0, total) exactly once with no gaps or overlaps", () => {
    fc.assert(
      fc.property(totalArb, pageSizeArb, (total, pageSize) => {
        const source = Array.from({ length: total }, (_, i) => i);
        const totalPages = pageCount(total, pageSize);

        const collected: number[] = [];
        for (let page = 1; page <= totalPages; page++) {
          const { from, to } = toRange(page, pageSize);
          // PostgREST `.range(from, to)` is inclusive on both ends, so the
          // equivalent JS slice is [from, to + 1). The DB returns only the rows
          // that exist, so we clamp the upper bound to `total` exactly as the
          // server would (no fabricated rows past the end).
          const upperExclusive = Math.min(to + 1, total);
          collected.push(...source.slice(from, upperExclusive));
        }

        // No missing entries, no duplicates, no truncation: the concatenation
        // of all pages is exactly the original ordered source collection.
        expect(collected).toEqual(source);
      }),
      { numRuns: 200 }
    );
  });

  // Property 4 (no overlaps, contiguous coverage): independently verify the
  // per-index coverage count is exactly 1 for every index, and that each page
  // boundary is contiguous with the next (no gap, no overlap between pages).
  it("produces contiguous, non-overlapping page boundaries", () => {
    fc.assert(
      fc.property(totalArb, pageSizeArb, (total, pageSize) => {
        const totalPages = pageCount(total, pageSize);
        const coverage = new Array<number>(total).fill(0);

        let previousTo = -1;
        for (let page = 1; page <= totalPages; page++) {
          const { from, to } = toRange(page, pageSize);

          // Each page begins exactly where the previous one ended: contiguous,
          // with no gap and no overlap.
          expect(from).toBe(previousTo + 1);
          // A full page spans exactly `pageSize` inclusive indices.
          expect(to - from + 1).toBe(pageSize);
          previousTo = to;

          for (let i = from; i <= to && i < total; i++) {
            coverage[i]! += 1;
          }
        }

        // Every real index is covered exactly once.
        for (let i = 0; i < total; i++) {
          expect(coverage[i]).toBe(1);
        }
      }),
      { numRuns: 200 }
    );
  });

  // Property 4 (hasMore correctness): hasMore is true on a page iff at least one
  // further item exists beyond that page. Equivalent to `page < pageCount`.
  it("returns hasMore true exactly when more rows remain beyond the page", () => {
    fc.assert(
      fc.property(
        totalArb,
        pageSizeArb,
        // Probe pages within and a little past the final page.
        fc.integer({ min: 1, max: 50 }),
        (total, pageSize, page) => {
          const totalPages = pageCount(total, pageSize);

          // Number of rows consumed up to and including this page.
          const consumed = page * pageSize;
          const moreRemains = consumed < total;

          expect(hasMore(page, pageSize, total)).toBe(moreRemains);
          // hasMore is true exactly for pages strictly before the last page.
          expect(hasMore(page, pageSize, total)).toBe(page < totalPages);
        }
      ),
      { numRuns: 200 }
    );
  });

  // Property 4 (termination / no silent truncation): following `hasMore` as the
  // "load more" signal terminates after exactly `pageCount` pages and the last
  // page that reports `hasMore === false` is the page that reaches the end.
  it("terminates paging at the last page and never truncates early", () => {
    fc.assert(
      fc.property(totalArb, pageSizeArb, (total, pageSize) => {
        const totalPages = pageCount(total, pageSize);

        // Walk pages while hasMore says to continue, starting from page 1.
        let page = 1;
        let visited = 0;
        // Cap iterations defensively so a regression cannot hang the test.
        const maxIterations = totalPages + 5;
        while (hasMore(page, pageSize, total) && visited < maxIterations) {
          page += 1;
          visited += 1;
        }

        if (total === 0) {
          // Empty source: zero pages, nothing more to load from page 1.
          expect(totalPages).toBe(0);
          expect(hasMore(1, pageSize, total)).toBe(false);
        } else {
          // We stop precisely on the final page, having collected every row.
          expect(page).toBe(totalPages);
          expect(hasMore(page, pageSize, total)).toBe(false);
          // The final page's inclusive range reaches at least the last index.
          const { to } = toRange(page, pageSize);
          expect(to).toBeGreaterThanOrEqual(total - 1);
        }
      }),
      { numRuns: 200 }
    );
  });
});
