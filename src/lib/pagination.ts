// Task 6.5: Shared pagination helpers (pure business logic)
// Requirements: 32.2, 33.2, 33.3, 34.3
//
// Single source of pagination math shared by the leaderboard, transaction
// history, marketplace, and discussion surfaces. The low-level range formula
// lives in `@/types/pagination` (`getPaginationRange`, consumed by the list
// hooks); these helpers wrap it with totality guarantees and add the
// "is there another page?" and "how many pages?" predicates the student
// surfaces need for "load more" behavior.

import { getPaginationRange } from "@/types/pagination";

/**
 * Inclusive, zero-based row range for a single page.
 *
 * Matches the Supabase PostgREST `.range(from, to)` convention exactly: both
 * bounds are inclusive and zero-based, so a page of `pageSize` rows spans
 * `to - from + 1 === pageSize` indices.
 */
export interface PageRange {
  /** Inclusive zero-based index of the first row on the page. */
  from: number;
  /** Inclusive zero-based index of the last row on the page. */
  to: number;
}

/**
 * Normalizes a 1-based page number to a safe positive integer.
 * Non-finite, fractional, or sub-1 inputs collapse to the first page so the
 * helpers stay total and never emit a negative `from`.
 */
function normalizePage(page: number): number {
  if (!Number.isFinite(page)) return 1;
  const floored = Math.floor(page);
  return floored < 1 ? 1 : floored;
}

/**
 * Normalizes a page size to a safe positive integer (≥ 1).
 * A page size below 1 would make pagination unable to make progress, so it is
 * clamped to 1.
 */
function normalizePageSize(pageSize: number): number {
  if (!Number.isFinite(pageSize)) return 1;
  const floored = Math.floor(pageSize);
  return floored < 1 ? 1 : floored;
}

/**
 * Normalizes a total count to a non-negative integer.
 */
function normalizeTotal(total: number): number {
  if (!Number.isFinite(total)) return 0;
  const floored = Math.floor(total);
  return floored < 0 ? 0 : floored;
}

/**
 * Returns the inclusive zero-based `{ from, to }` row range for a page.
 *
 * Page numbers are 1-based to match the existing list hooks. The range formula
 * is delegated to `getPaginationRange` so there is a single source of truth for
 * the `from = (page - 1) * pageSize` math.
 *
 * @param page - 1-based page number (clamped to ≥ 1).
 * @param pageSize - rows per page (clamped to ≥ 1).
 */
export function toRange(page: number, pageSize: number): PageRange {
  const { from, to } = getPaginationRange(
    normalizePage(page),
    normalizePageSize(pageSize)
  );
  return { from, to };
}

/**
 * Total number of pages required to hold `total` rows at `pageSize` per page.
 *
 * This is the exact mathematical count: `ceil(total / pageSize)`. An empty
 * collection therefore has `0` pages, which keeps Property 4 (completeness)
 * exact — concatenating zero pages reproduces an empty source. Callers that
 * want a "Page 1 of 1" display for empty data should apply their own
 * `Math.max(1, …)` at the presentation layer.
 *
 * @param total - total row count (clamped to ≥ 0).
 * @param pageSize - rows per page (clamped to ≥ 1).
 */
export function pageCount(total: number, pageSize: number): number {
  return Math.ceil(normalizeTotal(total) / normalizePageSize(pageSize));
}

/**
 * Whether at least one more row exists beyond the given page.
 *
 * Returns `true` exactly when there is a further item past the end of `page`,
 * and `false` on (or past) the final page. This drives "load more" affordances
 * without silently truncating: the consumer keeps paging while `hasMore` is
 * `true`.
 *
 * Equivalent to `page < pageCount(total, pageSize)`.
 *
 * @param page - 1-based page number (clamped to ≥ 1).
 * @param pageSize - rows per page (clamped to ≥ 1).
 * @param total - total row count across all pages (clamped to ≥ 0).
 */
export function hasMore(
  page: number,
  pageSize: number,
  total: number
): boolean {
  const p = normalizePage(page);
  const ps = normalizePageSize(pageSize);
  return normalizeTotal(total) > p * ps;
}
