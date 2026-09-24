import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { useCourses, useTeacherCourses, type CourseFilters } from '@/hooks/useCourses';
import { courseNameSortFromState, getCourseSortOrders, type CourseNameSort } from '@/lib/courseListSorting';
import { queryKeys } from '@/lib/queryKeys';

const seam = vi.hoisted(() => ({ from: vi.fn(), user: { id: 't1' } as { id: string } | null }));
vi.mock('@/lib/supabase', () => ({ supabase: { from: seam.from } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: seam.user }) }));
const selection = '*, programs!courses_program_id_fkey(name), teacher:profiles!courses_teacher_id_fkey(full_name)';
const rows = [8, 2, 6, 1, 9, 4, 7, 3, 5].map((id, index) => ({
  id: String(id), name: id <= 4 ? 'Alpha' : id <= 7 ? 'Beta' : 'Gamma',
  code: `A,%${id}`, created_at: `2026-01-${String(index + 1).padStart(2, '0')}`,
  program_id: id % 2 ? 'p1' : 'p2', teacher_id: id <= 7 ? 't1' : 't2',
  programs: { name: 'Program' }, teacher: { full_name: 'Teacher' },
}));
type Row = (typeof rows)[number];
type Reply = { data: Row[] | null; count: number | null; error: Error | null };
type Order = { column: 'created_at' | 'name' | 'id'; ascending: boolean };
let requests: Builder[];
let hold: boolean;
let failure: Error | null;
let pending: (() => void)[];

// This models request semantics, not PostgreSQL collation or live authorization.
class Builder implements PromiseLike<Reply> {
  steps: unknown[][] = [];
  orders: Order[] = [];
  equalities: [keyof Row, string][] = [];
  bounds: [number, number] = [0, -1];
  search = '';
  reads = 0;
  constructor(table: string) { this.steps.push(['from', table]); }
  select(columns: string, options: { count: string }) {
    this.steps.push(['select', columns, options]); return this;
  }
  order(column: Order['column'], options: { ascending: boolean }) {
    this.orders.push({ column, ...options }); this.steps.push(['order', column, options]); return this;
  }
  range(from: number, to: number) {
    this.bounds = [from, to]; this.steps.push(['range', from, to]); return this;
  }
  eq(column: keyof Row, value: string) {
    this.equalities.push([column, value]); this.steps.push(['eq', column, value]); return this;
  }
  or(expression: string) {
    this.steps.push(['or', expression]);
    const [nameExpression] = expression.split('%,code.ilike.%');
    if (nameExpression === undefined) throw new Error('Missing name search expression');
    this.search = nameExpression.slice('name.ilike.%'.length).replace(/\\(.)/g, '$1');
    return this;
  }
  then<T = Reply, U = never>(fulfilled?: ((value: Reply) => T | PromiseLike<T>) | null,
    rejected?: ((reason: unknown) => U | PromiseLike<U>) | null): Promise<T | U> {
    this.reads++;
    const filtered = rows.filter(row => this.equalities.every(([column, value]) => row[column] === value)
      && [row.name, row.code].some(value => value.toLowerCase().includes(this.search.toLowerCase())));
    filtered.sort((a, b) => {
      for (const { column, ascending } of this.orders) {
        const result = a[column] < b[column] ? -1 : a[column] > b[column] ? 1 : 0;
        if (result) return ascending ? result : -result;
      }
      return 0;
    });
    const reply: Reply = { data: filtered.slice(this.bounds[0], this.bounds[1] + 1), count: filtered.length, error: failure };
    const promise = hold ? new Promise<Reply>(resolve => pending.push(() => resolve(reply))) : Promise.resolve(reply);
    return promise.then(fulfilled, rejected);
  }
}
let client: QueryClient;
let fetchSpy: MockInstance<typeof fetch>;
const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
const ids = (data: { data: { id: string }[] } | undefined) => data?.data.map(row => row.id);
const key = (filters: CourseFilters = {}) => queryKeys.courses.list({ ...filters, page: filters.page ?? 1, pageSize: filters.pageSize ?? 25 });
beforeEach(() => {
  requests = []; pending = []; hold = false; failure = null; seam.user = { id: 't1' };
  seam.from.mockReset().mockImplementation((table: string) => {
    const request = new Builder(table); requests.push(request); return request;
  });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => { throw new Error('Unexpected network'); });
});
afterEach(() => {
  cleanup(); client.clear(); expect(fetchSpy).not.toHaveBeenCalled(); vi.restoreAllMocks();
});

describe('bounded course Name sorting', () => {
  it('accepts only the supported direction and single Name state', () => {
    expect(getCourseSortOrders(undefined)).toEqual([{ column: 'created_at', ascending: false }]);
    for (const direction of ['asc', 'desc'] as const) {
      expect(getCourseSortOrders(direction)).toEqual([{ column: 'name', ascending: direction === 'asc' }, { column: 'id', ascending: true }]);
      expect(courseNameSortFromState([{ id: 'name', desc: direction === 'desc' }])).toBe(direction);
    }
    expect(courseNameSortFromState([])).toBeUndefined();
    for (const invalid of [null, '', 'ASC', 'created_at', 0, {}, []]) expect(() => getCourseSortOrders(invalid)).toThrow();
    expect(() => courseNameSortFromState([{ id: 'code', desc: false }])).toThrow();
    expect(() => courseNameSortFromState([{ id: 'name', desc: false }, { id: 'name', desc: true }])).toThrow();
    expect(seam.from).not.toHaveBeenCalled();
  });

  it.each(['asc', 'desc'] as const)('sorts the entire dataset %s before each bounded page, with stable id ties', async (nameSort: CourseNameSort) => {
    const expected = nameSort === 'asc' ? ['1', '2', '3', '4', '5', '6', '7', '8', '9'] : ['8', '9', '5', '6', '7', '1', '2', '3', '4'];
    const combined: string[] = [];
    for (const page of [1, 2, 3]) {
      const hook = renderHook(() => useCourses({ nameSort, page, pageSize: 3 }), { wrapper });
      await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
      expect(ids(hook.result.current.data)).toEqual(expected.slice((page - 1) * 3, page * 3));
      expect(hook.result.current.data).toMatchObject({ count: 9, page, pageSize: 3 });
      combined.push(...(ids(hook.result.current.data) ?? []));
      expect(requests[page - 1]?.steps).toEqual([
        ['from', 'courses'], ['select', selection, { count: 'exact' }],
        ['order', 'name', { ascending: nameSort === 'asc' }], ['order', 'id', { ascending: true }],
        ['range', (page - 1) * 3, page * 3 - 1],
      ]);
      expect(requests[page - 1]?.reads).toBe(1); hook.unmount();
    }
    expect(combined).toEqual(expected); expect(new Set(combined).size).toBe(rows.length);
    expect(seam.from).toHaveBeenCalledTimes(3);
  });

  it('preserves the exact default request/key, joins, and 30-second freshness', async () => {
    const hook = renderHook(() => useCourses(), { wrapper });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(ids(hook.result.current.data)).toEqual(['5', '3', '7', '4', '9', '1', '6', '2', '8']);
    expect(hook.result.current.data).toMatchObject({ count: 9, page: 1, pageSize: 25 });
    expect(hook.result.current.data?.data[0]).toMatchObject({ programs: { name: 'Program' }, teacher: { full_name: 'Teacher' } });
    expect(requests[0]?.steps).toEqual([['from', 'courses'], ['select', selection, { count: 'exact' }], ['order', 'created_at', { ascending: false }], ['range', 0, 24]]);
    expect(client.getQueryCache().getAll().map(query => query.queryKey)).toEqual([['courses', 'list', { page: 1, pageSize: 25 }]]);
    const updated = hook.result.current.dataUpdatedAt; hook.unmount();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(updated + 29_999);
    const fresh = renderHook(() => useCourses(), { wrapper });
    expect(fresh.result.current.isSuccess).toBe(true); expect(requests).toHaveLength(1); fresh.unmount();
    clock.mockReturnValue(updated + 30_001);
    renderHook(() => useCourses(), { wrapper });
    await waitFor(() => expect(requests).toHaveLength(2));
  });

  it('separates sort, page and every filter in cache while filtering before slicing', async () => {
    const variants: CourseFilters[] = [
      { nameSort: 'asc' }, { nameSort: 'desc' }, { nameSort: 'asc', page: 2 },
      { nameSort: 'asc', programId: 'p1' }, { nameSort: 'asc', teacherId: 't2' },
      { nameSort: 'asc', search: 'Gamma' }, { nameSort: 'asc', pageSize: 2 },
    ];
    const expected = [['1', '2', '3'], ['8', '9', '5'], ['4', '5', '6'], ['1', '3', '5'], ['8', '9'], ['8', '9'], ['1', '2']];
    for (const [index, variant] of variants.entries()) {
      const filters = { pageSize: 3, ...variant };
      const hook = renderHook(() => useCourses(filters), { wrapper });
      await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
      expect(ids(hook.result.current.data)).toEqual(expected[index]);
      expect(hook.result.current.data?.count).toBe([9, 9, 9, 5, 2, 2, 9][index]);
      expect(client.getQueryData(key(filters))).toEqual(hook.result.current.data); hook.unmount();
    }
    expect(client.getQueryCache().getAll()).toHaveLength(variants.length);
    const cached = renderHook(() => useCourses({ nameSort: 'asc', pageSize: 3 }), { wrapper });
    expect(ids(cached.result.current.data)).toEqual(expected[0]); expect(requests).toHaveLength(variants.length);
    expect(requests.every(request => request.reads === 1 && request.steps.filter(step => step[0] === 'range').length === 1)).toBe(true);
  });

  it('preserves teacher ownership, disabled states, joins and escaped search', async () => {
    seam.user = null;
    const hook = renderHook(({ enabled }) => useTeacherCourses({ nameSort: 'asc', programId: 'p1', search: 'A,%', pageSize: 2 }, { enabled }), { wrapper, initialProps: { enabled: true } });
    expect(hook.result.current.fetchStatus).toBe('idle'); expect(requests).toHaveLength(0);
    seam.user = { id: 't1' }; hook.rerender({ enabled: false });
    expect(hook.result.current.fetchStatus).toBe('idle'); expect(requests).toHaveLength(0);
    hook.rerender({ enabled: true });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(ids(hook.result.current.data)).toEqual(['1', '3']);
    expect(hook.result.current.data).toMatchObject({ count: 4, page: 1, pageSize: 2 });
    expect(requests[0]?.steps).toEqual([
      ['from', 'courses'], ['select', selection, { count: 'exact' }], ['order', 'name', { ascending: true }], ['order', 'id', { ascending: true }],
      ['range', 0, 1], ['eq', 'program_id', 'p1'], ['eq', 'teacher_id', 't1'], ['or', 'name.ilike.%A\\,\\%%,code.ilike.%A\\,\\%%'],
    ]);
    expect(requests[0]?.reads).toBe(1); expect(requests).toHaveLength(1);
  });

  it('retains previous data during sorting and ignores a late obsolete page result', async () => {
    const hook = renderHook((filters: CourseFilters) => useCourses(filters), { wrapper, initialProps: { nameSort: 'asc', page: 1, pageSize: 3 } as CourseFilters });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    hold = true; hook.rerender({ nameSort: 'asc', page: 2, pageSize: 3 });
    await waitFor(() => expect(pending).toHaveLength(1));
    expect(hook.result.current.isPlaceholderData).toBe(true); expect(ids(hook.result.current.data)).toEqual(['1', '2', '3']);
    hook.rerender({ nameSort: 'desc', page: 1, pageSize: 3 });
    await waitFor(() => expect(pending).toHaveLength(2));
    expect(hook.result.current.isPlaceholderData).toBe(true);
    const [resolveOld, resolveNew] = pending;
    if (!resolveOld || !resolveNew) throw new Error('Both deferred requests must exist');
    await act(async () => { resolveNew(); });
    await waitFor(() => expect(ids(hook.result.current.data)).toEqual(['8', '9', '5']));
    expect(hook.result.current.isPlaceholderData).toBe(false);
    await act(async () => { resolveOld(); });
    await waitFor(() => expect(ids(client.getQueryData(key({ nameSort: 'asc', page: 2, pageSize: 3 })))).toEqual(['4', '5', '6']));
    expect(ids(hook.result.current.data)).toEqual(['8', '9', '5']);
    expect(requests).toHaveLength(3); expect(requests.every(request => request.reads === 1)).toBe(true);
  });

  it('rejects an unsupported hook direction before transport', async () => {
    // @ts-expect-error Runtime validation protects untyped callers as well.
    const hook = renderHook(() => useCourses({ nameSort: 'code' }), { wrapper });
    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(hook.result.current.error).toBeInstanceOf(Error); expect(seam.from).not.toHaveBeenCalled();
  });

  it('surfaces a bounded read error and allows an explicit retry', async () => {
    failure = new Error('read failed');
    const hook = renderHook(() => useCourses({ nameSort: 'desc', pageSize: 3 }), { wrapper });
    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(hook.result.current.error).toBe(failure); expect(requests).toHaveLength(1);
    failure = null; await act(async () => { await hook.result.current.refetch(); });
    await waitFor(() => expect(ids(hook.result.current.data)).toEqual(['8', '9', '5']));
    expect(requests).toHaveLength(2);
    expect(requests.every(request => request.reads === 1 && request.bounds[1] === 2)).toBe(true);
  });
});
