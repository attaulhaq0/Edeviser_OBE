// ─── Shared pagination types for list hooks ─────────────────────────────────

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 25;

export function getPaginationRange(page?: number, pageSize?: number) {
  const p = page ?? DEFAULT_PAGE;
  const ps = pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (p - 1) * ps;
  const to = from + ps - 1;
  return { page: p, pageSize: ps, from, to };
}
