import { useEffect } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import type { Profile } from "@/types/app";

interface ProfileResult { data: Profile | null; error: Error | null }
const transport = vi.hoisted(() => ({
  listeners: new Set<(event: string, session: Session | null) => void>(),
  onAuthStateChange: vi.fn(),
  getSession: vi.fn(),
  read: vi.fn<(id: string) => Promise<ProfileResult>>(),
}));
vi.mock("@/lib/supabase", () => ({ supabase: {
  auth: { onAuthStateChange: transport.onAuthStateChange, getSession: transport.getSession },
  from: () => ({ select: () => ({ eq: (_column: string, id: string) => ({ maybeSingle: () => transport.read(id) }) }) }),
} }));

import { AuthProvider } from "@/providers/AuthProvider";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { clearCachedProfile, readCachedProfile, writeCachedProfile } from "@/lib/profileCache";

const alice: Profile = {
  id: "alice", email: "alice@example.test", full_name: "Alice", role: "teacher", institution_id: "school-a",
  avatar_url: null, is_active: true, onboarding_completed: true, portfolio_public: false,
  theme_preference: "system", language_preference: "en", notification_preferences: {}, last_seen_at: null,
  tos_accepted_at: null, tour_completed_at: null, status: "active", created_at: "2026-01-01T00:00:00.000Z",
};
const bob: Profile = { ...alice, id: "bob", email: "bob@example.test", full_name: "Bob", role: "parent", institution_id: "school-b" };
const reply = (data: Profile | null): ProfileResult => ({ data, error: null });
const deferred = () => {
  let resolve: (result: ProfileResult) => void = () => { throw new Error("Uninitialized deferred"); };
  const promise = new Promise<ProfileResult>((done) => { resolve = done; });
  return { promise, resolve };
};
const session = (id: string) => ({ user: { id } }) as Session;
const emit = (event: string, id: string | null) => {
  for (const listener of transport.listeners) listener(event, id ? session(id) : null);
};
interface Observed { user: string | null; profile: string | null; loading: boolean }
const commits: Observed[] = [];
const mountedDraft = vi.fn(), unmountedDraft = vi.fn();
const Draft = () => {
  useEffect(() => { mountedDraft(); return () => { unmountedDraft(); }; }, []);
  return <Input aria-label="Draft fixture" defaultValue="" />;
};
const Probe = () => {
  const { user, profile, isLoading, role } = useAuth();
  useEffect(() => { commits.push({ user: user?.id ?? null, profile: profile?.id ?? null, loading: isLoading }); }, [user, profile, isLoading]);
  return <>
    <output data-testid="auth" data-user={user?.id ?? "none"} data-profile={profile?.id ?? "none"}
      data-loading={String(isLoading)} data-role={role ?? "none"} />
    {!isLoading && profile && <Draft />}
  </>;
};
const expectState = (user: string, profile: string, loading: boolean, role: string) => {
  const state = screen.getByTestId("auth");
  expect(state).toHaveAttribute("data-user", user);
  expect(state).toHaveAttribute("data-profile", profile);
  expect(state).toHaveAttribute("data-loading", String(loading));
  expect(state).toHaveAttribute("data-role", role);
};
const bootAlice = async () => {
  render(<AuthProvider><Probe /></AuthProvider>);
  await act(async () => { emit("INITIAL_SESSION", "alice"); });
  await waitFor(() => expectState("alice", "alice", false, "teacher"));
};

beforeEach(() => {
  localStorage.clear(); commits.length = 0; transport.listeners.clear();
  mountedDraft.mockClear(); unmountedDraft.mockClear();
  transport.onAuthStateChange.mockReset().mockImplementation((listener: (event: string, current: Session | null) => void) => {
    transport.listeners.add(listener);
    return { data: { subscription: { unsubscribe: () => transport.listeners.delete(listener) } } };
  });
  transport.getSession.mockReset().mockReturnValue(new Promise(() => undefined));
  transport.read.mockReset().mockImplementation(async (id) => reply(id === "alice" ? alice : bob));
});
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe("actual AuthProvider profile/session identity transitions", () => {
  it("clears A's profile before exposing uncached B and keeps loading through B token refresh", async () => {
    await bootAlice();
    const pending = deferred(); transport.read.mockReturnValueOnce(pending.promise);
    act(() => { emit("SIGNED_IN", "bob"); });
    expectState("bob", "none", true, "none");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    act(() => { emit("TOKEN_REFRESHED", "bob"); });
    expectState("bob", "none", true, "none");
    expect(transport.read.mock.calls.map(([id]) => id)).toEqual(["alice", "bob"]);
    await act(async () => { pending.resolve(reply(bob)); });
    await waitFor(() => expectState("bob", "bob", false, "parent"));
    expect(commits.some((state) => state.user === "bob" && state.profile === "alice")).toBe(false);
    expect(readCachedProfile("bob")?.profile.id).toBe("bob");
  });

  it("retains same-actor profile and draft identity during an uncached revalidation", async () => {
    await bootAlice(); clearCachedProfile();
    const field = screen.getByRole("textbox");
    fireEvent.change(field, { target: { value: "unfinished work" } });
    const pending = deferred(); transport.read.mockReturnValueOnce(pending.promise);
    act(() => { emit("USER_UPDATED", "alice"); });
    expectState("alice", "alice", false, "teacher");
    act(() => { emit("TOKEN_REFRESHED", "alice"); });
    expectState("alice", "alice", false, "teacher");
    expect(screen.getByRole("textbox")).toBe(field);
    expect(field).toHaveValue("unfinished work");
    await act(async () => { pending.resolve(reply({ ...alice, full_name: "Alice Updated" })); });
    expectState("alice", "alice", false, "teacher");
    expect(screen.getByRole("textbox")).toBe(field);
    expect(field).toHaveValue("unfinished work");
    expect(mountedDraft).toHaveBeenCalledTimes(1); expect(unmountedDraft).not.toHaveBeenCalled();
    expect(transport.onAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it.each(["before B", "after B"])("ignores a stale A profile completion %s settles", async (order) => {
    await bootAlice(); clearCachedProfile();
    const oldA = deferred(), pendingB = deferred();
    transport.read.mockReturnValueOnce(oldA.promise).mockReturnValueOnce(pendingB.promise);
    act(() => { emit("USER_UPDATED", "alice"); emit("SIGNED_IN", "bob"); });
    expectState("bob", "none", true, "none");
    if (order === "after B") {
      await act(async () => { pendingB.resolve(reply(bob)); });
      expectState("bob", "bob", false, "parent");
    }
    await act(async () => { oldA.resolve(reply({ ...alice, role: "admin" })); });
    if (order === "before B") {
      expectState("bob", "none", true, "none");
      expect(readCachedProfile("alice")).toBeNull();
      await act(async () => { pendingB.resolve(reply(bob)); });
    }
    expectState("bob", "bob", false, "parent");
    expect(readCachedProfile("bob")?.profile.id).toBe("bob");
    expect(commits.some((state) => state.user === "bob" && state.profile === "alice")).toBe(false);
  });

  it("rejects an old A completion after A→B→A even though the user id matches again", async () => {
    await bootAlice(); clearCachedProfile();
    const oldA = deferred(), pendingB = deferred(), freshA = deferred();
    transport.read.mockReturnValueOnce(oldA.promise).mockReturnValueOnce(pendingB.promise).mockReturnValueOnce(freshA.promise);
    act(() => { emit("USER_UPDATED", "alice"); emit("SIGNED_IN", "bob"); emit("SIGNED_IN", "alice"); });
    expectState("alice", "none", true, "none");
    await act(async () => { oldA.resolve(reply({ ...alice, role: "admin" })); pendingB.resolve(reply(bob)); });
    expectState("alice", "none", true, "none");
    await act(async () => { freshA.resolve(reply(alice)); });
    expectState("alice", "alice", false, "teacher");
    expect(readCachedProfile("alice")?.profile.role).toBe("teacher");
  });

  it("preserves the owned fresh-cache shell fast path for B", async () => {
    await bootAlice(); writeCachedProfile("bob", bob);
    const start = commits.length;
    act(() => { emit("SIGNED_IN", "bob"); });
    expectState("bob", "bob", false, "parent");
    expect(transport.read.mock.calls.map(([id]) => id)).toEqual(["alice"]);
    expect(commits.slice(start).every((state) => !state.loading && state.user === "bob" && state.profile === "bob")).toBe(true);
  });

  it.each(["missing", "error"])("settles B's %s profile without restoring A", async (kind) => {
    await bootAlice();
    const pending = deferred(); transport.read.mockReturnValueOnce(pending.promise);
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    act(() => { emit("SIGNED_IN", "bob"); });
    expectState("bob", "none", true, "none");
    await act(async () => { pending.resolve(kind === "error" ? { data: null, error: new Error("B read failed") } : reply(null)); });
    expectState("bob", "none", false, "none");
    if (kind === "error") expect(errorLog).toHaveBeenCalled();
    expect(commits.some((state) => state.user === "bob" && state.profile === "alice")).toBe(false);
  });
});
