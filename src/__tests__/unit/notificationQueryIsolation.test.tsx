import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Notification } from "@/hooks/useNotifications";

type Request = {
  table: string; operation: "select" | "update" | "delete"; columns?: string;
  options?: { count?: string; head?: boolean }; filters: Array<[string, unknown]>;
  order?: { column: string; ascending: boolean }; limit?: number; or?: string;
  patch?: { is_read: boolean };
};
type Reply = { data: unknown; error: Error | null; count?: number };
const wire = vi.hoisted(() => ({ execute: vi.fn<(request: Request) => Promise<Reply>>() }));
vi.mock("@/lib/supabase", () => {
  // Ordinary DTO seam only. QueryClient, observers, keys and mutations are real.
  class Builder implements PromiseLike<Reply> {
    private request: Request;
    constructor(table: string) { this.request = { table, operation: "select", filters: [] }; }
    select(columns: string, options?: Request["options"]) { this.request.columns = columns; this.request.options = options; return this; }
    eq(column: string, value: unknown) { this.request.filters.push([column, value]); return this; }
    order(column: string, options: { ascending: boolean }) { this.request.order = { column, ...options }; return this; }
    limit(limit: number) { this.request.limit = limit; return this; }
    or(filter: string) { this.request.or = filter; return this; }
    update(patch: { is_read: boolean }) { this.request.operation = "update"; this.request.patch = patch; return this; }
    delete() { this.request.operation = "delete"; return this; }
    then<T = Reply, E = never>(resolve?: ((value: Reply) => T | PromiseLike<T>) | null, reject?: ((reason: unknown) => E | PromiseLike<E>) | null): Promise<T | E> {
      return wire.execute({ ...this.request, filters: [...this.request.filters] }).then(resolve, reject);
    }
  }
  return { supabase: { from: (table: string) => new Builder(table) } };
});
import { useCommunications } from "@/hooks/useCommunications";
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead, useDeleteNotification } from "@/hooks/useNotifications";
import { queryKeys } from "@/lib/queryKeys";

let client: QueryClient;
let rows: Notification[];
let generation: number;
const seed = (actor: string): Notification[] => Array.from({ length: 60 }, (_, index) => ({
  id: `${actor}-${index}`, user_id: actor, type: "new_assignment", title: `${actor} notification ${index}`,
  body: "Existing notification", is_read: index === 0, metadata: { fixture: true }, created_at: "2026-01-01T12:00:00Z",
}));
const matches = (row: Notification, filters: Request["filters"]) => filters.every(([key, value]) =>
  key === "id" ? row.id === value : key === "user_id" ? row.user_id === value : key === "is_read" ? row.is_read === value : false);
const respond = async (request: Request): Promise<Reply> => {
  if (request.table === "notifications") {
    const selected = rows.filter((row) => matches(row, request.filters));
    if (request.operation === "update") {
      selected.forEach((row) => { row.is_read = request.patch?.is_read ?? row.is_read; }); generation++;
      return { data: null, error: null };
    }
    if (request.operation === "delete") {
      rows = rows.filter((row) => !selected.includes(row)); generation++;
      return { data: null, error: null };
    }
    if (request.options?.head) return { data: null, count: selected.length, error: null };
    return { data: selected.slice(0, request.limit).map((row) => ({ ...row })), error: null };
  }
  if (request.operation !== "select") throw new Error("Announcement writes are outside this test contract");
  if (request.table === "announcements") return { data: [{ id: "announcement-1", title: `Announcement ${generation}`, content: "School update", is_pinned: true, created_at: "2026-01-01T12:00:00Z" }], error: null };
  if (request.table === "announcement_reads") return { data: [{ announcement_id: "announcement-1" }], error: null };
  throw new Error(`Unexpected table: ${request.table}`);
};
const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
const mountBell = (id: string | undefined = "alice") => renderHook(() => useNotifications(id), { wrapper: Wrapper });
const mountCommunications = (id: string | undefined = "alice") => renderHook(() => useCommunications(id), { wrapper: Wrapper });
const mountUnread = (id: string | undefined = "alice") => renderHook(() => useUnreadCount(id), { wrapper: Wrapper });
type Bell = ReturnType<typeof mountBell>;
type Communications = ReturnType<typeof mountCommunications>;
const settled = async (...views: Array<{ result: { current: { isSuccess: boolean; isFetching: boolean; isError: boolean } } }>) => {
  await waitFor(() => views.forEach((view) => {
    expect(view.result.current.isSuccess).toBe(true); expect(view.result.current.isFetching).toBe(false); expect(view.result.current.isError).toBe(false);
  }));
};
const reads = (kind: "bell" | "communications" | "unread") => wire.execute.mock.calls.filter(([request]) => request.table === "notifications" && request.operation === "select"
  && (kind === "unread" ? request.options?.head === true : !request.options?.head && (kind === "bell" ? request.limit === 50 : request.limit === undefined)));
const assertShapes = (bell: Bell, communications: Communications, count = 60, actor = "alice") => {
  expect(Array.isArray(bell.result.current.data)).toBe(true);
  expect(bell.result.current.data).toHaveLength(Math.min(50, count));
  expect(bell.result.current.data?.[0]).toMatchObject({ user_id: actor, is_read: expect.any(Boolean) });
  expect(Array.isArray(communications.result.current.data)).toBe(false);
  expect(communications.result.current.data?.notifications).toHaveLength(count);
  expect(communications.result.current.data?.notifications[0]).toMatchObject({ kind: "notification", isRead: expect.any(Boolean) });
  expect(communications.result.current.data?.announcements[0]).toMatchObject({ kind: "announcement", isRead: true, title: `Announcement ${generation}` });
  expect(client.getQueryData(queryKeys.notifications.list({ userId: actor }))).toEqual(bell.result.current.data);
  expect(client.getQueryData(queryKeys.notifications.list({ userId: actor, scope: "communications" }))).toEqual(communications.result.current.data);
};

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { staleTime: 300_000, retry: false }, mutations: { retry: false } } });
  rows = [...seed("alice"), ...seed("bob")]; generation = 0;
  wire.execute.mockReset().mockImplementation(respond);
  vi.spyOn(globalThis, "fetch").mockImplementation(async () => { throw new Error("Unexpected network access in notification isolation tests"); });
});
afterEach(() => {
  cleanup(); client.clear();
  expect(globalThis.fetch).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});

describe("notification query contract isolation", () => {
  it.each(["bell", "communications"] as const)("warm %s first does not suppress the other contract's read", async (first) => {
    let bell: Bell, communications: Communications;
    if (first === "bell") { bell = mountBell(); await settled(bell); communications = mountCommunications(); }
    else { communications = mountCommunications(); await settled(communications); bell = mountBell(); }
    await settled(bell, communications);
    assertShapes(bell, communications);
    expect(reads("bell")).toHaveLength(1); expect(reads("communications")).toHaveLength(1);
    expect(reads("bell")[0]?.[0]).toMatchObject({ columns: "id, user_id, type, title, body, is_read, metadata, created_at", limit: 50, filters: [["user_id", "alice"]], order: { column: "created_at", ascending: false } });
    expect(reads("communications")[0]?.[0]).toMatchObject({ columns: "*", filters: [["user_id", "alice"]], order: { column: "created_at", ascending: false } });
    expect(wire.execute.mock.calls.filter(([request]) => request.table === "announcements")).toHaveLength(1);
    expect(wire.execute.mock.calls.find(([request]) => request.table === "announcement_reads")?.[0].or).toBe("student_id.eq.alice,user_id.eq.alice");
  });

  it.each(["bell", "communications"] as const)("concurrent %s first starts both distinct reads before either resolves", async (first) => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    wire.execute.mockImplementation(async (request) => { await gate; return respond(request); });
    const firstView = first === "bell" ? mountBell() : mountCommunications();
    const secondView = first === "bell" ? mountCommunications() : mountBell();
    try {
      await waitFor(() => { expect(reads("bell")).toHaveLength(1); expect(reads("communications")).toHaveLength(1); });
    } finally { await act(async () => { release(); await gate; }); }
    await settled(firstView, secondView);
    expect(Array.isArray(client.getQueryData(queryKeys.notifications.list({ userId: "alice" })))).toBe(true);
    expect(client.getQueryData(queryKeys.notifications.list({ userId: "alice", scope: "communications" }))).toMatchObject({ notifications: expect.any(Array), announcements: expect.any(Array) });
  });

  it("remounts warm same-actor contracts without new reads or crossed shapes", async () => {
    const firstBell = mountBell(), firstCommunications = mountCommunications(); await settled(firstBell, firstCommunications);
    const calls = wire.execute.mock.calls.length;
    firstBell.unmount(); firstCommunications.unmount();
    const bell = mountBell(), communications = mountCommunications(); await settled(bell, communications);
    assertShapes(bell, communications); expect(wire.execute).toHaveBeenCalledTimes(calls);
  });

  it("deduplicates same-actor consumers within each contract, not across contracts", async () => {
    const bell1 = mountBell(), bell2 = mountBell(), comm1 = mountCommunications(), comm2 = mountCommunications();
    await settled(bell1, bell2, comm1, comm2);
    assertShapes(bell1, comm1);
    expect(bell2.result.current.data).toBe(bell1.result.current.data);
    expect(comm2.result.current.data).toBe(comm1.result.current.data);
    expect(reads("bell")).toHaveLength(1); expect(reads("communications")).toHaveLength(1);
  });

  it("preserves actor partitioning for both representations", async () => {
    const aliceBell = mountBell(), aliceComm = mountCommunications(), bobBell = mountBell("bob"), bobComm = mountCommunications("bob");
    await settled(aliceBell, aliceComm, bobBell, bobComm);
    assertShapes(aliceBell, aliceComm); assertShapes(bobBell, bobComm, 60, "bob");
    expect(bobComm.result.current.data?.notifications.every((item) => item.id.startsWith("bob-"))).toBe(true);
    expect(client.getQueryCache().findAll({ queryKey: queryKeys.notifications.all })).toHaveLength(4);
  });

  it("keeps undefined-actor queries disabled without transport", () => {
    // Explicit undefined defaults to alice in convenience helpers, so mount the hooks directly.
    const view = renderHook(() => ({ bell: useNotifications(undefined), communications: useCommunications(undefined), unread: useUnreadCount(undefined) }), { wrapper: Wrapper });
    expect(view.result.current.bell.isFetching).toBe(false);
    expect(view.result.current.communications.isFetching).toBe(false);
    expect(view.result.current.unread.isFetching).toBe(false);
    expect(wire.execute).not.toHaveBeenCalled();
  });

  it("refetches all active contracts through the unchanged notifications prefix", async () => {
    const bell = mountBell(), communications = mountCommunications(), unread = mountUnread(); await settled(bell, communications, unread);
    expect(unread.result.current.data).toBe(59);
    const row = rows.find((item) => item.id === "alice-1"); if (!row) throw new Error("Missing fixture");
    row.is_read = true; row.title = "Updated notification"; generation++;
    await act(async () => { await client.invalidateQueries({ queryKey: queryKeys.notifications.all }); });
    await settled(bell, communications, unread);
    assertShapes(bell, communications); expect(unread.result.current.data).toBe(58);
    expect(bell.result.current.data?.[1]?.title).toBe("Updated notification");
    expect(communications.result.current.data?.notifications[1]?.title).toBe("Updated notification");
    for (const kind of ["bell", "communications", "unread"] as const) expect(reads(kind)).toHaveLength(2);
    expect(client.getQueryCache().findAll({ queryKey: queryKeys.notifications.all })).toHaveLength(3);
  });

  it.each(["mark-one", "mark-all", "delete", "communications-mark"] as const)("preserves broad refetch after the real %s notification mutation", async (action) => {
    const bell = mountBell(), communications = mountCommunications(), unread = mountUnread(); await settled(bell, communications, unread);
    const mutation = renderHook(() => ({ mark: useMarkAsRead(), all: useMarkAllAsRead(), remove: useDeleteNotification() }), { wrapper: Wrapper });
    await act(async () => {
      if (action === "mark-one") await mutation.result.current.mark.mutateAsync("alice-1");
      else if (action === "mark-all") await mutation.result.current.all.mutateAsync("alice");
      else if (action === "delete") await mutation.result.current.remove.mutateAsync("alice-1");
      else communications.result.current.markNotificationRead("alice-1");
    });
    await waitFor(() => { for (const kind of ["bell", "communications", "unread"] as const) expect(reads(kind)).toHaveLength(2); });
    await settled(bell, communications, unread);
    assertShapes(bell, communications, action === "delete" ? 59 : 60);
    expect(unread.result.current.data).toBe(action === "mark-all" ? 0 : 58);
    const writes = wire.execute.mock.calls.filter(([request]) => request.operation !== "select");
    expect(writes).toHaveLength(1); expect(writes[0]?.[0].table).toBe("notifications");
    expect(writes[0]?.[0].filters).toEqual(action === "mark-all" ? [["user_id", "alice"], ["is_read", false]] : [["id", "alice-1"]]);
    expect(writes[0]?.[0].operation).toBe(action === "delete" ? "delete" : "update");
  });
});
