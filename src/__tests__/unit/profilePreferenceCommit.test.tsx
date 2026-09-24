import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn(), eq: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: db.from } }));
import { useDebouncedProfilePreference } from "@/hooks/useDebouncedProfilePreference";
import { createProfilePreferenceSync, type ProfilePreferenceSync } from "@/lib/profilePreferenceSync";
import { ProfilePreferenceSyncContext } from "@/providers/ProfilePreferenceSyncContext";

const key = "edeviser.auth.profile.v1";
const seed = (ownerId = "alice") => {
  const raw = JSON.stringify({ userId: ownerId, cachedAt: 123,
    profile: { id: ownerId, role: "admin", institution_id: "tenant", preferred_language: "en", language_preference: "en" },
  });
  localStorage.setItem(key, raw);
  return raw;
};
const deferredWrite = () => {
  let resolve: (value: { error: Error | null }) => void = () => { throw new Error("Uninitialized"); };
  const promise = new Promise<{ error: Error | null }>((done) => { resolve = done; });
  return { promise, resolve };
};
let client: QueryClient;
let sync: ProfilePreferenceSync;
const onConfirmed = vi.fn();
const Wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>
    <ProfilePreferenceSyncContext.Provider value={{ sync, ownership: sync.getOwnership() }}>{children}</ProfilePreferenceSyncContext.Provider>
  </QueryClientProvider>
);
const mount = () => renderHook(({ ownerId }) => useDebouncedProfilePreference(ownerId), {
  initialProps: { ownerId: "alice" }, wrapper: Wrapper,
});
const advance = async () => { await act(async () => { await vi.advanceTimersByTimeAsync(900); }); };

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  seed();
  client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity } } });
  sync = createProfilePreferenceSync(onConfirmed);
  sync.setOwner("alice");
  db.from.mockReturnValue({ update: db.update });
  db.update.mockReturnValue({ eq: db.eq });
  db.eq.mockResolvedValue({ error: null });
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup(); client.clear(); vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear();
});

describe("actual successful preference writes own cache/context updates", () => {
  it("rejects a retained setter after batched A to B to A, but accepts the current setter", async () => {
    const view = mount();
    const oldSetter = view.result.current;
    act(() => { sync.setOwner("bob"); sync.setOwner("alice"); });
    const oldLocal = vi.fn();
    act(() => oldSetter({ preferred_language: "ar" }, oldLocal));
    expect(oldLocal).not.toHaveBeenCalled();
    view.rerender({ ownerId: "alice" });
    const currentLocal = vi.fn();
    act(() => view.result.current({ preferred_language: "ar" }, currentLocal));
    await advance();
    expect(currentLocal).toHaveBeenCalledTimes(1);
    expect(db.eq).toHaveBeenCalledExactlyOnceWith("id", "alice");
    expect(onConfirmed).toHaveBeenCalledTimes(1);
  });

  it("does not report a disposed lifecycle's late failure after batched A to B to A", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const pending = deferredWrite();
    db.eq.mockReturnValueOnce(pending.promise);
    const view = mount();
    act(() => view.result.current({ preferred_language: "ar" }, () => {}));
    await advance();
    act(() => { sync.setOwner("bob"); sync.setOwner("alice"); });
    await act(async () => { pending.resolve({ error: new Error("old lifecycle failure") }); });
    expect(log).not.toHaveBeenCalled();
    expect(onConfirmed).not.toHaveBeenCalled();
  });

  it("does not patch while pending, then patches cache/context once after success", async () => {
    const pending = deferredWrite();
    db.eq.mockReturnValueOnce(pending.promise);
    const { result } = mount();
    const before = localStorage.getItem(key);
    act(() => result.current({ preferred_language: "ar" }, () => {}));
    await advance();
    expect(db.eq).toHaveBeenCalledExactlyOnceWith("id", "alice");
    expect(localStorage.getItem(key)).toBe(before);
    expect(onConfirmed).not.toHaveBeenCalled();
    await act(async () => { pending.resolve({ error: null }); });
    expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({ cachedAt: 123, profile: { preferred_language: "ar", language_preference: "en" } });
    expect(onConfirmed).toHaveBeenCalledTimes(1);
  });

  it("never patches cache/context on a rejected server write", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.eq.mockResolvedValueOnce({ error: new Error("save failed") });
    const { result } = mount();
    const before = localStorage.getItem(key);
    act(() => result.current({ preferred_language: "ar" }, () => {}));
    await advance();
    expect(localStorage.getItem(key)).toBe(before);
    expect(onConfirmed).not.toHaveBeenCalled();
    expect(db.eq).toHaveBeenCalledTimes(1);
  });

  it.each(["switch", "same-user-return", "unmount"])("ignores a dispatched completion after %s", async (transition) => {
    const pending = deferredWrite();
    db.eq.mockReturnValueOnce(pending.promise);
    const view = mount();
    act(() => view.result.current({ preferred_language: "ar" }, () => {}));
    await advance();
    act(() => {
      sync.setOwner(transition === "unmount" ? null : "bob");
      if (transition === "same-user-return") {
        // No intermediate React render: UID equality alone cannot detect this.
        sync.setOwner("alice");
      } else if (transition === "switch") view.rerender({ ownerId: "bob" });
      else view.unmount();
    });
    const before = seed(transition === "same-user-return" ? "alice" : "bob");
    await act(async () => { pending.resolve({ error: null }); });
    expect(localStorage.getItem(key)).toBe(before);
    expect(onConfirmed).not.toHaveBeenCalled();
  });

  it("does not treat a skipped queued mutation as a successful cache update", async () => {
    const pending = deferredWrite();
    db.eq.mockReturnValueOnce(pending.promise);
    const view = mount();
    act(() => view.result.current({ preferred_language: "ar" }, () => {}));
    await advance();
    act(() => view.result.current({ preferred_language: "en" }, () => {}));
    await advance();
    act(() => { sync.setOwner("bob"); view.rerender({ ownerId: "bob" }); });
    const before = seed("bob");
    await act(async () => { pending.resolve({ error: null }); });
    await advance();
    expect(db.eq).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(key)).toBe(before);
    expect(onConfirmed).not.toHaveBeenCalled();
  });
});
