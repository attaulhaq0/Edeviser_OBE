import { act, cleanup, fireEvent, render, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, useEffect, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AccessibilityPreferences } from "@/lib/accessibilityPreferences";

type Response = { data: unknown; error: Error | null };
type ReadRequest = { table: string; columns: string; id: string; signal: AbortSignal };
type WriteRequest = { table: string; columns: string; id: string; patch: { accessibility_preferences: Record<string, unknown> } };
const db = vi.hoisted(() => ({ read: vi.fn<(request: ReadRequest) => Promise<Response>>(), write: vi.fn<(request: WriteRequest) => Promise<Response>>(), getUser: vi.fn(), server: new Map<string, unknown>() }));
const auth = vi.hoisted(() => ({ userId: "alice" as string | null, isLoading: false }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: auth.userId ? { id: auth.userId } : null, isLoading: auth.isLoading }) }));
vi.mock("@/lib/supabase", () => ({ supabase: {
  auth: { getUser: db.getUser },
  from: (table: string) => ({
    select: (columns: string) => ({ eq: (_key: string, id: string) => ({ abortSignal: (signal: AbortSignal) => ({ maybeSingle: () => db.read({ table, columns, id, signal }) }) }) }),
    update: (patch: WriteRequest["patch"]) => ({ eq: (_key: string, id: string) => ({ select: (columns: string) => ({ maybeSingle: async () => {
      const result = await db.write({ table, columns, id, patch });
      // Causal DTO seam: a successful owned update commits its submitted JSON
      // before the serialized slot releases. A response may still be malformed.
      if (!result.error && result.data && typeof result.data === "object" && "id" in result.data && result.data.id === id) {
        db.server.set(id, patch.accessibility_preferences);
      }
      return result;
    } }) }) }),
  }),
} }));
import { AccessibilityPreferencesProvider } from "@/providers/AccessibilityPreferencesProvider";
import { ProfilePreferenceSyncContext } from "@/providers/ProfilePreferenceSyncContext";
import { createProfilePreferenceSync, type ProfilePreferenceSync } from "@/lib/profilePreferenceSync";
import { useAccessibilityPreferences, useAccessibilityPreferenceControls, useUpdateAccessibilityPreferences } from "@/hooks/useAccessibilityPreferences";
import { accessibilityPreferencesSchema, loadAccessibilityPreferences, saveAccessibilityPreferencesLocal, REDUCED_MOTION_QUERY } from "@/lib/accessibilityPreferences";
import { _resetFontLoaded } from "@/lib/fontPreferences";
import { acknowledgeAccessibilityWrite, createAccessibilityPreferenceOwner, parseAccessibilityProfile } from "@/lib/accessibilityPreferenceOwner";

const defaults = accessibilityPreferencesSchema.parse({});
const storageKey = "edeviser-accessibility-prefs";
const response = (id: string, prefs: unknown): Response => ({ data: { id, accessibility_preferences: prefs }, error: null });
const deferred = () => {
  let resolve: (value: Response) => void = () => { throw new Error("Uninitialized"); };
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
};
let client: QueryClient;
let sync: ProfilePreferenceSync;
const originalFonts = Object.getOwnPropertyDescriptor(document, "fonts");
const loadedFaces = (font: string): FontFace[] => {
  const [style = "normal", weight = "400"] = font.split(" ");
  return [{ family: "OpenDyslexic", style, weight, status: "loaded" } as FontFace];
};
const fontLoad = vi.fn(async (font: string): Promise<FontFace[]> => loadedFaces(font));
const Probe = () => ({ read: useAccessibilityPreferences(), update: useUpdateAccessibilityPreferences(), controls: useAccessibilityPreferenceControls() });
const Wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>
    <ProfilePreferenceSyncContext.Provider value={{ sync, ownership: sync.getOwnership() }}>
      <AccessibilityPreferencesProvider>{children}</AccessibilityPreferencesProvider>
    </ProfilePreferenceSyncContext.Provider>
  </QueryClientProvider>
);
const mount = (strict = false) => renderHook(Probe, { wrapper: strict ? ({ children }) => <StrictMode><Wrapper>{children}</Wrapper></StrictMode> : Wrapper });
const ready = async (view: ReturnType<typeof mount>) => { await waitFor(() => expect(view.result.current.controls.profileRead.status).toBe("ready")); };
const saved = async (view: ReturnType<typeof mount>) => { await waitFor(() => expect(view.result.current.controls.accountSync.status).toBe("saved")); };
const changeActor = (id: string | null) => { auth.userId = id; sync.setOwner(id); };

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); _resetFontLoaded(); db.server.clear();
  auth.userId = "alice"; auth.isLoading = false;
  sync = createProfilePreferenceSync(vi.fn()); sync.setOwner("alice");
  client = new QueryClient({ defaultOptions: { queries: { staleTime: 300_000, retry: false }, mutations: { retry: false, gcTime: Infinity } } });
  db.read.mockReset().mockImplementation(async ({ id }) => response(id, db.server.get(id) ?? defaults));
  db.write.mockReset().mockImplementation(async ({ id, patch }) => response(id, patch.accessibility_preferences));
  fontLoad.mockReset().mockImplementation(async (font) => loadedFaces(font));
  // This owner seam has no errored CSS-connected faces; native retry behavior
  // is verified separately against Chromium's actual FontFaceSet and stylesheet.
  Object.defineProperty(document, "fonts", { configurable: true, value: { load: fontLoad, forEach: vi.fn() } });
});
afterEach(() => {
  cleanup(); client.clear(); _resetFontLoaded(); vi.restoreAllMocks(); localStorage.clear();
  if (originalFonts) Object.defineProperty(document, "fonts", originalFonts); else Reflect.deleteProperty(document, "fonts");
  document.documentElement.classList.remove("dyslexia-font", "high-contrast", "reduce-animations", "simplified-view");
  document.documentElement.style.removeProperty("font-size");
  delete document.documentElement.dataset.alternateFont;
});

describe("actual provider/query read ownership", () => {
  it("renders device prefs immediately but forces the owned remote read despite global staleTime", async () => {
    const pending = deferred(); db.read.mockReturnValue(pending.promise);
    saveAccessibilityPreferencesLocal({ ...defaults, font_size: "large" });
    const view = mount();
    expect(view.result.current.read.data?.font_size).toBe("large");
    expect(document.documentElement.style.fontSize).toBe("18px");
    await waitFor(() => expect(db.read).toHaveBeenCalledTimes(1));
    expect(db.read.mock.calls[0]?.[0]).toMatchObject({ table: "profiles", columns: "id, accessibility_preferences", id: "alice" });
    await act(async () => pending.resolve(response("alice", { ...defaults, high_contrast: true })));
    await ready(view);
    expect(view.result.current.controls.source).toBe("profile");
    expect(document.documentElement.classList.contains("high-contrast")).toBe(true);
    expect(loadAccessibilityPreferences()).toEqual({ ...defaults, font_size: "large" });
    expect(db.getUser).not.toHaveBeenCalled();
    expect(view.result.current.controls.retryDevicePersistence()).toBe(false);
    expect(loadAccessibilityPreferences().font_size).toBe("large");
  });

  it.each(["missing row", "null field", "invalid field", "read error"])("retains fallback and does not claim profile data for %s", async (kind) => {
    saveAccessibilityPreferencesLocal({ ...defaults, font_size: "x-large" });
    db.read.mockResolvedValue(kind === "missing row" ? { data: null, error: null }
      : kind === "read error" ? { data: null, error: new Error("unavailable") }
      : response("alice", kind === "null field" ? null : { high_contrast: "invalid" }));
    const view = mount();
    await waitFor(() => expect(view.result.current.controls.profileRead.status).toBe(kind === "invalid field" ? "invalid" : kind === "read error" ? "error" : "missing"));
    expect(view.result.current.controls.effective.font_size).toBe("x-large");
    expect(document.documentElement.style.fontSize).toBe("20px");
    expect(view.result.current.controls.source).toBe("device");
  });

  it("does not overwrite a newer local edit while waiting for metadata; preserves unknown JSON leaves", async () => {
    const pending = deferred(); db.read.mockReturnValue(pending.promise);
    const view = mount();
    act(() => view.result.current.controls.patchLatest({ font_size: "large" }));
    expect(view.result.current.controls.effective.font_size).toBe("large");
    expect(db.write).not.toHaveBeenCalled();
    await act(async () => pending.resolve(response("alice", { ...defaults, future_setting: { contrast: [1, true, null] } })));
    await saved(view);
    expect(view.result.current.read.data?.font_size).toBe("large");
    expect(db.write.mock.calls[0]?.[0].patch).toEqual({ accessibility_preferences: { ...defaults, font_size: "large", future_setting: { contrast: [1, true, null] } } });
    expect(loadAccessibilityPreferences()).toEqual({ ...defaults, font_size: "large" });
  });

  it.each(["partial", "full"])("rebases %s initial intent onto a fresh known baseline without copying hydration into device storage", async (mode) => {
    const pending = deferred(); db.read.mockReturnValueOnce(pending.promise);
    db.server.set("alice", { ...defaults, font_size: "large", reduced_animations: true, future_setting: { retained: true } });
    const view = mount();
    act(() => {
      if (mode === "partial") view.result.current.controls.patchLatest({ high_contrast: true });
      else view.result.current.update.mutate({ ...defaults, high_contrast: true });
    });
    await saved(view); // must NOT wait for or reuse the predecessor-era query
    expect(db.read).toHaveBeenCalledTimes(2);
    expect(db.read.mock.calls[0]?.[0].signal).not.toBe(db.read.mock.calls[1]?.[0].signal);
    expect(db.write.mock.calls[0]?.[0].patch.accessibility_preferences).toMatchObject({
      high_contrast: true, font_size: mode === "partial" ? "large" : "default", reduced_animations: mode === "partial", future_setting: { retained: true },
    });
    expect(loadAccessibilityPreferences()).toEqual({ ...defaults, high_contrast: true });
    await act(async () => pending.resolve(response("alice", defaults)));
    await waitFor(() => expect(view.result.current.read.isFetching).toBe(false));
    expect(view.result.current.read.isError).toBe(false);
    expect(view.result.current.read.data?.font_size).toBe(mode === "partial" ? "large" : "default");
  });

  it("settles a superseded same-owner query error after a successful write-side read and ACK", async () => {
    const pending = deferred(); db.read.mockReturnValueOnce(pending.promise);
    const view = mount();
    act(() => view.result.current.controls.patchLatest({ high_contrast: true })); await saved(view);
    await act(async () => pending.resolve({ data: null, error: new Error("obsolete initial read") }));
    await waitFor(() => expect(view.result.current.read.isFetching).toBe(false));
    expect(view.result.current.read.isError).toBe(false);
    expect(view.result.current.controls.profileRead.status).toBe("ready");
    expect(view.result.current.controls.accountSync.status).toBe("saved");
    expect(view.result.current.read.data?.high_contrast).toBe(true);
  });

  it("ignores cancelled/older reads even if the transport ignores abort", async () => {
    const first = deferred(), second = deferred();
    db.read.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const view = mount();
    await waitFor(() => expect(db.read).toHaveBeenCalledTimes(1));
    let refetch: ReturnType<typeof view.result.current.read.refetch>;
    act(() => { refetch = view.result.current.read.refetch(); });
    await waitFor(() => expect(db.read).toHaveBeenCalledTimes(2));
    expect(db.read.mock.calls[0]?.[0].signal.aborted).toBe(true);
    await act(async () => { second.resolve(response("alice", { ...defaults, high_contrast: true })); await refetch; });
    await act(async () => first.resolve(response("alice", defaults)));
    expect(view.result.current.controls.effective.high_contrast).toBe(true);
  });

  it("isolates A→B and A→logout→A with scalar keys and guards retained callbacks before React rerenders", async () => {
    const pending = deferred(); db.read.mockReturnValueOnce(pending.promise);
    const view = mount(); const old = view.result.current.controls; const keyA = old.ownerKey;
    act(() => { changeActor("bob"); changeActor("alice"); old.patchLatest({ high_contrast: true }); });
    expect(localStorage.getItem(storageKey)).toBeNull();
    view.rerender(); await ready(view);
    expect(view.result.current.controls.ownerKey).not.toBe(keyA);
    await act(async () => pending.resolve(response("alice", { ...defaults, font_size: "x-large" })));
    expect(view.result.current.controls.effective.font_size).toBe("default");
    act(() => changeActor("bob")); view.rerender(); await ready(view);
    expect(db.read.mock.calls[db.read.mock.calls.length - 1]?.[0].id).toBe("bob");
    expect(client.getQueryCache().findAll({ queryKey: ["accessibility", "preferences"] }).every((query) => query.queryKey[2] === "bob")).toBe(true);
  });

  it("keeps an explicit device choice through logout without copying remote hydration into it", async () => {
    const view = mount(); await ready(view);
    act(() => view.result.current.controls.patchLatest({ font_size: "large" })); await saved(view);
    act(() => changeActor(null)); view.rerender();
    expect(view.result.current.controls.profileRead.status).toBe("device-only");
    expect(view.result.current.controls.effective.font_size).toBe("large");
    expect(document.documentElement.style.fontSize).toBe("18px");
    expect(db.read).toHaveBeenCalledTimes(2); // startup + fresh mutation preflight
  });
});

describe("actual mutation scope, acknowledgement and failure contracts", () => {
  it("merges partial patches against the latest ref and skips superseded queued full-object writes", async () => {
    const first = deferred(); db.write.mockReturnValueOnce(first.promise);
    const view = mount(); await ready(view);
    act(() => view.result.current.controls.patchLatest({ high_contrast: true }));
    await waitFor(() => expect(db.write).toHaveBeenCalledTimes(1));
    act(() => { view.result.current.controls.patchLatest({ font_size: "large" }); view.result.current.controls.patchLatest({ reduced_animations: true }); });
    expect(view.result.current.controls.effective).toEqual({ ...defaults, high_contrast: true, font_size: "large", reduced_animations: true });
    await act(async () => first.resolve(response("alice", { ...defaults, high_contrast: true })));
    await saved(view);
    expect(db.write).toHaveBeenCalledTimes(2);
    expect(db.write.mock.calls[1]?.[0].patch.accessibility_preferences).toMatchObject({ high_contrast: true, font_size: "large", reduced_animations: true });
  });

  it.each(["zero rows", "wrong actor", "partial ack", "different prefs", "write error"])("requires a complete matching owned acknowledgement: %s", async (kind) => {
    db.write.mockResolvedValue(kind === "zero rows" ? { data: null, error: null }
      : kind === "write error" ? { data: null, error: new Error("denied") }
      : response(kind === "wrong actor" ? "bob" : "alice", kind === "partial ack" ? { high_contrast: true } : defaults));
    const view = mount(); await ready(view);
    act(() => view.result.current.controls.patchLatest({ high_contrast: true }));
    await waitFor(() => expect(view.result.current.controls.accountSync.status).toBe("error"));
    expect(view.result.current.controls.effective.high_contrast).toBe(true);
    expect(view.result.current.read.data?.high_contrast).toBe(true);
    expect(document.documentElement.classList.contains("high-contrast")).toBe(true);
    expect(loadAccessibilityPreferences().high_contrast).toBe(true);
    expect(view.result.current.controls.devicePersistence.status).toBe("saved");
    db.write.mockImplementation(async ({ id, patch }) => response(id, patch.accessibility_preferences));
    await act(async () => { await view.result.current.controls.retryAccountSync(); });
    await saved(view);
  });

  it.each(["dropped", "nested changed", "array changed"])("rejects an otherwise matching ACK when submitted unknown JSON is %s", async (kind) => {
    const future = { nested: { mode: "keep" }, ordered: [1, true, null] };
    db.server.set("alice", { ...defaults, future_setting: future });
    db.write.mockImplementation(async ({ id, patch }) => {
      const known = accessibilityPreferencesSchema.parse(patch.accessibility_preferences);
      return response(id, kind === "dropped" ? known : { ...known, future_setting: kind === "nested changed"
        ? { ...future, nested: { mode: "changed" } } : { ...future, ordered: [true, 1, null] } });
    });
    const view = mount(); await ready(view);
    act(() => view.result.current.controls.patchLatest({ high_contrast: true }));
    await waitFor(() => expect(view.result.current.controls.accountSync.status).toBe("error"));
    expect(view.result.current.controls.effective.high_contrast).toBe(true);
    db.write.mockImplementation(async ({ id, patch }) => response(id, patch.accessibility_preferences));
    await act(async () => { await view.result.current.controls.retryAccountSync(); }); await saved(view);
    expect(db.write.mock.calls[1]?.[0].patch.accessibility_preferences.future_setting).toEqual(future);
  });

  it("allows additional server object keys without losing submitted nested leaves", async () => {
    db.server.set("alice", { ...defaults, future_setting: { mode: "keep" } });
    db.write.mockImplementation(async ({ id, patch }) => response(id, {
      ...patch.accessibility_preferences, server_added: { value: 1 }, future_setting: { extra: true, mode: "keep" },
    }));
    const view = mount(); await ready(view);
    act(() => view.result.current.controls.patchLatest({ high_contrast: true })); await saved(view);
  });

  it.each(["invalid", "error", "missing"])("refuses a blind overwrite after %s read, but retries through a fresh valid read", async (kind) => {
    db.read.mockResolvedValue(kind === "error" ? { data: null, error: new Error("unavailable") }
      : kind === "missing" ? { data: null, error: null } : response("alice", { font_size: "bad", extra: "keep" }));
    const view = mount();
    await waitFor(() => expect(view.result.current.controls.profileRead.status).toBe(kind));
    act(() => view.result.current.controls.patchLatest({ font_size: "large" }));
    await waitFor(() => expect(view.result.current.controls.accountSync.status).toBe("error"));
    expect(db.write).not.toHaveBeenCalled();
    db.read.mockResolvedValue(response("alice", { ...defaults, extra: "keep" }));
    await act(async () => { await view.result.current.controls.retryAccountSync(); }); await saved(view);
    expect(db.write.mock.calls[0]?.[0].patch.accessibility_preferences).toMatchObject({ font_size: "large", extra: "keep" });
  });

  it("owns UI retry failures without rejecting, while public mutateAsync still rejects", async () => {
    const view = mount(); await ready(view);
    db.write.mockResolvedValue({ data: null, error: new Error("denied") });
    await act(async () => {
      await expect(view.result.current.update.mutateAsync({ ...defaults, high_contrast: true })).rejects.toThrow("denied");
      await expect(view.result.current.controls.retryAccountSync()).resolves.toBeUndefined();
    });
    expect(view.result.current.controls.accountSync.status).toBe("error");
    db.read.mockResolvedValue({ data: null, error: new Error("offline") });
    await act(async () => { await expect(view.result.current.controls.retryProfileRead()).resolves.toBeUndefined(); });
    expect(view.result.current.controls.profileRead.status).toBe("error");
    expect(view.result.current.controls.effective.high_contrast).toBe(true);
  });

  it("allows a null field only when the read returned the owned row", async () => {
    db.read.mockResolvedValue(response("alice", null));
    const view = mount(); await waitFor(() => expect(view.result.current.controls.profileRead.status).toBe("missing"));
    act(() => view.result.current.controls.patchLatest({ high_contrast: true })); await saved(view);
  });

  it("retains in-memory and remote saving when localStorage is denied, with truthful retry status", async () => {
    const view = mount(); await ready(view);
    const set = vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw new Error("quota"); });
    act(() => view.result.current.controls.patchLatest({ font_size: "large" })); await saved(view);
    expect(view.result.current.controls.devicePersistence.status).toBe("error");
    expect(view.result.current.controls.effective.font_size).toBe("large");
    expect(document.documentElement.style.fontSize).toBe("18px");
    set.mockRestore();
    act(() => { expect(view.result.current.controls.retryDevicePersistence()).toBe(true); });
    expect(view.result.current.controls.devicePersistence.status).toBe("saved");
    expect(loadAccessibilityPreferences().font_size).toBe("large");
  });

  it("serializes writes for the same account across lifecycles and ignores the original completion", async () => {
    const pending = deferred(); db.write.mockReturnValueOnce(pending.promise);
    const view = mount(); await ready(view);
    const oldSuccess = vi.fn(), oldError = vi.fn();
    act(() => view.result.current.update.mutate({ ...defaults, high_contrast: true }, { onSuccess: oldSuccess, onError: oldError }));
    await waitFor(() => expect(db.write).toHaveBeenCalledTimes(1));
    act(() => { changeActor(null); changeActor("alice"); }); view.rerender(); await ready(view);
    act(() => view.result.current.controls.patchLatest({ font_size: "x-large" }));
    expect(db.write).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve({ data: null, error: new Error("old failure") }));
    await saved(view);
    expect(db.write).toHaveBeenCalledTimes(2);
    expect(oldSuccess).not.toHaveBeenCalled(); expect(oldError).not.toHaveBeenCalled();
    expect(view.result.current.controls.effective.font_size).toBe("x-large");
  });

  it("starts A2's partial-write read after A1 settles, preserving A1's acknowledged untouched field", async () => {
    const first = deferred(); db.write.mockReturnValueOnce(first.promise);
    const view = mount(); await ready(view);
    act(() => view.result.current.controls.patchLatest({ high_contrast: true }));
    await waitFor(() => expect(db.write).toHaveBeenCalledTimes(1));
    expect(db.read).toHaveBeenCalledTimes(2); // A1 startup and write-side read
    act(() => { changeActor(null); changeActor("alice"); }); view.rerender(); await ready(view);
    expect(view.result.current.controls.effective.high_contrast).toBe(false); // A2 startup read predates A1 ACK
    act(() => view.result.current.controls.patchLatest({ reduced_animations: true }));
    expect(db.read).toHaveBeenCalledTimes(3); // queued A2 must not preflight yet
    await act(async () => first.resolve(response("alice", { ...defaults, high_contrast: true })));
    await saved(view);
    expect(db.read).toHaveBeenCalledTimes(4);
    expect(db.write.mock.calls[1]?.[0].patch.accessibility_preferences).toMatchObject({ high_contrast: true, reduced_animations: true });
    expect(view.result.current.controls.effective.high_contrast).toBe(true);
    expect(view.result.current.controls.effective.reduced_animations).toBe(true);
    await waitFor(() => expect(view.result.current.read.isFetching).toBe(false));
    expect(view.result.current.read.isError).toBe(false);
  });

  it.each(["success", "failure"])("binds dispatched A writes and ignores their %s after B takes ownership", async (outcome) => {
    const pending = deferred(); db.write.mockReturnValueOnce(pending.promise);
    localStorage.setItem("edeviser.auth.profile.v1", "untouched-profile-cache");
    const confirm = vi.spyOn(sync, "confirm");
    const view = mount(); await ready(view);
    const onSuccess = vi.fn(), onError = vi.fn();
    act(() => view.result.current.update.mutate({ ...defaults, high_contrast: true }, { onSuccess, onError }));
    await waitFor(() => expect(db.write).toHaveBeenCalledTimes(1));
    const oldMutation = client.getMutationCache().getAll().find((mutation) => mutation.state.status === "pending");
    if (!oldMutation) throw new Error("Missing pending native mutation");
    const oldFunction = oldMutation.options.mutationFn, oldKey = oldMutation.options.mutationKey;
    expect(oldMutation.options.scope?.id).toBe("accessibility-preferences:alice");
    act(() => changeActor("bob")); view.rerender(); await ready(view);
    expect(oldMutation.options.mutationFn).toBe(oldFunction);
    expect(oldMutation.options.mutationKey).toEqual(oldKey);
    expect(oldMutation.options.scope?.id).toBe("accessibility-preferences:alice");
    act(() => view.result.current.controls.patchLatest({ font_size: "large" })); await saved(view);
    await act(async () => pending.resolve(outcome === "success" ? response("alice", { ...defaults, high_contrast: true }) : { data: null, error: new Error("stale A") }));
    expect(db.write.mock.calls.map(([request]) => request.id)).toEqual(["alice", "bob"]);
    expect(view.result.current.controls.effective).toEqual({ ...defaults, font_size: "large" });
    expect(loadAccessibilityPreferences()).toEqual({ ...defaults, font_size: "large" });
    expect(onSuccess).not.toHaveBeenCalled(); expect(onError).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
    expect(localStorage.getItem("edeviser.auth.profile.v1")).toBe("untouched-profile-cache");
  });

  it.each(["success", "error"])("ignores a pre-ACK read %s without undoing current intent or leaving the public query fetching", async (outcome) => {
    const pendingRead = deferred(), pendingWrite = deferred();
    const view = mount(); await ready(view);
    db.write.mockReturnValueOnce(pendingWrite.promise);
    act(() => view.result.current.controls.patchLatest({ high_contrast: true }));
    await waitFor(() => expect(db.write).toHaveBeenCalledTimes(1));
    db.read.mockReturnValueOnce(pendingRead.promise);
    let reading: Promise<void>;
    act(() => { reading = view.result.current.controls.retryProfileRead(); });
    await waitFor(() => expect(db.read).toHaveBeenCalledTimes(3));
    await act(async () => pendingWrite.resolve(response("alice", { ...defaults, high_contrast: true })));
    await act(async () => { pendingRead.resolve(outcome === "success" ? response("alice", defaults) : { data: null, error: new Error("stale read") }); await reading; });
    expect(view.result.current.controls.effective.high_contrast).toBe(true);
    expect(view.result.current.read.data?.high_contrast).toBe(true);
    await waitFor(() => expect(view.result.current.read.isFetching).toBe(false));
    expect(view.result.current.read.isError).toBe(false);
    expect(view.result.current.controls.profileRead.status).toBe("ready");
    expect(view.result.current.controls.accountSync.status).toBe("saved");
  });

  it("keeps legacy full-object mutateAsync and guarded callback shapes", async () => {
    const view = mount(); await ready(view); const success = vi.fn();
    const next: AccessibilityPreferences = { ...defaults, font_size: "large" };
    await act(async () => { expect(await view.result.current.update.mutateAsync(next, { onSuccess: success })).toEqual(next); });
    expect(success.mock.calls[0]?.[1]).toEqual(next);
    expect(view.result.current.update.variables).toEqual(next);
  });
});

describe("framework-free metadata confirmation fence", () => {
  it("rejects another owner's read/write stamps even when lease and revision numbers collide", () => {
    const first = createAccessibilityPreferenceOwner("alice", defaults, () => true);
    const second = createAccessibilityPreferenceOwner("alice", defaults, () => true);
    first.activate(); second.activate();
    const foreignRead = first.beginRead();
    const foreign = first.edit({ high_contrast: true });
    const own = second.edit({ reduced_animations: true });
    if (!foreign || !own) throw new Error("Missing intents");
    expect(foreign.lease).toBe(own.lease); expect(foreign.revision).toBe(own.revision);
    expect(second.owns(foreign)).toBe(false); expect(second.latest(foreign)).toBe(false);
    const parsed = parseAccessibilityProfile(response("alice", defaults).data, "alice");
    expect(second.finishRead(foreignRead, parsed)).toBe(false);
    expect(second.acceptPreflight(foreign, parsed)).toBe(false);
    second.confirm(foreign, parsed); second.failWrite(foreign, new Error("foreign"));
    expect(second.getSnapshot().effective.reduced_animations).toBe(true);
    expect(second.getSnapshot().accountSync.status).toBe("pending");
    first.deactivate(); second.deactivate();
  });
  it.each(["success", "error"])("does not discard ACK-added metadata on a later completion of an older read: %s", (outcome) => {
    const owner = createAccessibilityPreferenceOwner("alice", defaults, () => true); owner.activate();
    const initial = { ...defaults, future_setting: { preserved: true } };
    owner.finishRead(owner.beginRead(), parseAccessibilityProfile(response("alice", initial).data, "alice"));
    const intent = owner.edit({ high_contrast: true }); if (!intent) throw new Error("Missing intent");
    owner.acceptPreflight(intent, parseAccessibilityProfile(response("alice", initial).data, "alice"));
    const submitted = owner.payload(); const oldRead = owner.beginRead();
    const acknowledged = { ...submitted, server_added: { nested: ["kept"] } };
    owner.confirm(intent, acknowledgeAccessibilityWrite(response("alice", acknowledged).data, "alice", submitted));
    if (outcome === "success") owner.finishRead(oldRead, parseAccessibilityProfile(response("alice", initial).data, "alice"));
    else owner.failRead(oldRead, new Error("old failure"));
    expect(owner.payload()).toEqual(acknowledged);
    expect(owner.getSnapshot().accountSync.status).toBe("saved");
    expect(owner.getSnapshot().profileRead.status).toBe("ready");
    owner.deactivate();
  });
});

describe("render/font resources belong to the mounted owner", () => {
  it.each([false, true])("combines live OS motion reduction with stored=%s without saving or resetting fonts", async (stored) => {
    let system = true;
    const media = window.matchMedia(REDUCED_MOTION_QUERY);
    vi.spyOn(media, "matches", "get").mockImplementation(() => system);
    vi.spyOn(window, "matchMedia").mockReturnValue(media);
    const prefs = { ...defaults, reduced_animations: stored, dyslexia_font: true };
    saveAccessibilityPreferencesLocal(prefs); db.server.set("alice", prefs);
    const view = mount(); await ready(view);
    await waitFor(() => expect(view.result.current.controls.fontRequest).toBe("ready"));
    const effective = view.result.current.controls.effective;
    const persistence = view.result.current.controls.devicePersistence;
    const account = view.result.current.controls.accountSync;
    const device = localStorage.getItem(storageKey);
    const reads = db.read.mock.calls.length, fonts = fontLoad.mock.calls.length;
    const storage = vi.spyOn(localStorage, "setItem");
    expect(document.documentElement.classList.contains("reduce-animations")).toBe(true);
    for (const next of [false, true, false]) {
      act(() => { system = next; media.dispatchEvent(new Event("change")); });
      expect(document.documentElement.classList.contains("reduce-animations")).toBe(stored || next);
      expect(view.result.current.controls.effective).toBe(effective);
      expect(view.result.current.controls.effective.reduced_animations).toBe(stored);
      expect(view.result.current.controls.devicePersistence).toBe(persistence);
      expect(view.result.current.controls.accountSync).toBe(account);
      expect(document.documentElement.dataset.alternateFont).toBe("ready");
      expect(document.documentElement.classList.contains("dyslexia-font")).toBe(true);
    }
    expect(storage).not.toHaveBeenCalled(); expect(localStorage.getItem(storageKey)).toBe(device);
    expect(db.read).toHaveBeenCalledTimes(reads); expect(db.write).not.toHaveBeenCalled();
    expect(fontLoad).toHaveBeenCalledTimes(fonts);
  });

  it("removes OS motion listeners and ignores queued events from old owners or disposed leases", async () => {
    const media = window.matchMedia(REDUCED_MOTION_QUERY);
    vi.spyOn(media, "matches", "get").mockReturnValue(false);
    vi.spyOn(window, "matchMedia").mockReturnValue(media);
    const added = vi.spyOn(media, "addEventListener"), removed = vi.spyOn(media, "removeEventListener");
    db.server.set("alice", { ...defaults, reduced_animations: true });
    const view = mount(); await ready(view);
    const oldListener = added.mock.calls[0]?.[1];
    if (typeof oldListener !== "function") throw new Error("Missing OS motion listener");
    act(() => changeActor("bob"));
    document.documentElement.classList.remove("reduce-animations");
    Reflect.apply(oldListener, media, []); // token invalidated before provider rerender
    expect(document.documentElement.classList.contains("reduce-animations")).toBe(false);
    view.rerender(); await ready(view);
    expect(added).toHaveBeenCalledTimes(2); expect(removed).toHaveBeenCalledWith("change", oldListener);
    Reflect.apply(oldListener, media, []);
    expect(document.documentElement.classList.contains("reduce-animations")).toBe(false);
    const currentListener = added.mock.calls[1]?.[1];
    if (typeof currentListener !== "function") throw new Error("Missing current OS listener");
    view.unmount(); expect(removed).toHaveBeenCalledTimes(2);
    document.documentElement.classList.add("reduce-animations");
    Reflect.apply(currentListener, media, []);
    expect(document.documentElement.classList.contains("reduce-animations")).toBe(true);
    expect(db.write).not.toHaveBeenCalled(); expect(localStorage.getItem(storageKey)).toBeNull();
  });
  it("preserves child form state and mount identity through guest settlement, actor changes and batched ABA", () => {
    changeActor(null); auth.isLoading = true;
    const mounted = vi.fn(), unmounted = vi.fn();
    const Child = () => {
      const controls = useAccessibilityPreferenceControls();
      useEffect(() => { mounted(); return () => { unmounted(); }; }, []);
      return <><input aria-label="Preserved form field" defaultValue="" /><output data-testid="owner-key">{controls.ownerKey}</output></>;
    };
    const view = render(<Wrapper><Child /></Wrapper>);
    const input = view.getByRole("textbox"); const guestKey = view.getByTestId("owner-key").textContent;
    fireEvent.change(input, { target: { value: "unfinished signup" } });
    auth.isLoading = false; view.rerender(<Wrapper><Child /></Wrapper>);
    expect(view.getByTestId("owner-key").textContent).toBe(guestKey);
    changeActor("alice"); view.rerender(<Wrapper><Child /></Wrapper>);
    const firstA = view.getByTestId("owner-key").textContent;
    changeActor("bob"); changeActor("alice"); view.rerender(<Wrapper><Child /></Wrapper>);
    expect(view.getByTestId("owner-key").textContent).not.toBe(firstA);
    changeActor("bob"); view.rerender(<Wrapper><Child /></Wrapper>);
    expect(view.getByRole("textbox")).toBe(input);
    expect(input).toHaveProperty("value", "unfinished signup");
    expect(mounted).toHaveBeenCalledTimes(1); expect(unmounted).not.toHaveBeenCalled();
    view.unmount(); expect(unmounted).toHaveBeenCalledTimes(1);
  });
  it("survives StrictMode setup/cleanup and does not duplicate owners or profile writes", async () => {
    const view = mount(true); await ready(view);
    act(() => view.result.current.controls.patchLatest({ font_size: "large" })); await saved(view);
    expect(db.write).toHaveBeenCalledTimes(1);
    expect(client.getQueryCache().findAll({ queryKey: ["accessibility", "preferences"] })).toHaveLength(1);
    expect(document.documentElement.style.fontSize).toBe("18px");
  });

  it("guards retained refetch and every UI retry callback after unmount", async () => {
    const view = mount(); await ready(view); const old = view.result.current;
    view.unmount();
    await expect(old.read.refetch()).rejects.toBeInstanceOf(Error);
    await expect(old.controls.retryProfileRead()).resolves.toBeUndefined();
    await expect(old.controls.retryAccountSync()).resolves.toBeUndefined();
    expect(old.controls.retryDevicePersistence()).toBe(false);
    old.controls.retryFont(); old.controls.patchLatest({ dyslexia_font: true });
    expect(db.read).toHaveBeenCalledTimes(1); expect(db.write).not.toHaveBeenCalled();
    expect(fontLoad).not.toHaveBeenCalled(); expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it("keeps locale independent and cancels pending font activation on OFF/unmount", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    fontLoad.mockImplementation(async (font) => { await gate; return loadedFaces(font); });
    const view = mount(); await ready(view);
    const ownerKey = view.result.current.controls.ownerKey;
    act(() => view.result.current.controls.patchLatest({ dyslexia_font: true })); await saved(view);
    expect(view.result.current.controls.fontRequest).toBe("loading");
    document.documentElement.lang = "ar"; document.documentElement.dir = "rtl"; view.rerender();
    expect(view.result.current.controls.ownerKey).toBe(ownerKey);
    expect(view.result.current.controls.effective.dyslexia_font).toBe(true);
    act(() => view.result.current.controls.patchLatest({ dyslexia_font: false })); await saved(view);
    view.unmount();
    await act(async () => { release(); await gate; });
    expect(document.documentElement.classList.contains("dyslexia-font")).toBe(false);
    expect(document.documentElement.dataset.alternateFont).toBe("off");
    expect(fontLoad).toHaveBeenCalledTimes(4);
    document.documentElement.removeAttribute("lang"); document.documentElement.removeAttribute("dir");
  });

  it("reports font failure separately from account success, permits retry and OFF, and cleans the observer", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const disconnect = vi.spyOn(MutationObserver.prototype, "disconnect");
    fontLoad.mockResolvedValueOnce([]);
    const view = mount(); await ready(view);
    act(() => view.result.current.controls.patchLatest({ dyslexia_font: true })); await saved(view);
    await waitFor(() => expect(view.result.current.controls.fontRequest).toBe("error"));
    expect(view.result.current.controls.effective.dyslexia_font).toBe(true);
    act(() => view.result.current.controls.retryFont());
    await waitFor(() => expect(view.result.current.controls.fontRequest).toBe("ready"));
    expect(db.write).toHaveBeenCalledTimes(1);
    act(() => view.result.current.controls.patchLatest({ dyslexia_font: false })); await saved(view);
    expect(view.result.current.controls.fontRequest).toBe("off");
    const before = disconnect.mock.calls.length; const old = view.result.current.controls;
    view.unmount(); expect(disconnect.mock.calls.length).toBeGreaterThan(before);
    act(() => old.patchLatest({ high_contrast: true }));
    expect(loadAccessibilityPreferences().high_contrast).toBe(false);
  });
});
