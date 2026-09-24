import { useContext, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { CancelledError, useQuery, useMutation, useQueryClient, type MutateOptions, type UseMutationResult } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  type AccessibilityPreferences, accessibilityPreferencesSchema,
  persistAccessibilityPreferencesLocal, applyAccessibilityPreferences,
  applyAccessibilityMotionPreference, REDUCED_MOTION_QUERY,
} from "@/lib/accessibilityPreferences";
import { applyDyslexiaFont } from "@/lib/fontPreferences";
import {
  acknowledgeAccessibilityWrite, parseAccessibilityProfile, preferenceError,
  type AccessibilityPreferenceOwner, type AccessibilityWriteIntent, type FontRequestStatus,
} from "@/lib/accessibilityPreferenceOwner";
import { AccessibilityPreferencesContext, type AccessibilityPreferencesContextValue } from "@/providers/AccessibilityPreferencesContext";

const useOwnerContext = () => {
  const context = useContext(AccessibilityPreferencesContext);
  if (!context) throw new Error("Accessibility preference hooks require one AccessibilityPreferencesProvider");
  return context;
};
/** Public compatibility adapters: consumers never instantiate another owner/query. */
export const useAccessibilityPreferences = () => useOwnerContext().read;
export const useUpdateAccessibilityPreferences = () => useOwnerContext().update;
export const useAccessibilityPreferenceControls = () => useOwnerContext().controls;

type Options = MutateOptions<AccessibilityPreferences, Error, AccessibilityPreferences>;
const fontStatus = (): FontRequestStatus => {
  const value = document.documentElement.dataset.alternateFont;
  return value === "loading" || value === "ready" || value === "error" ? value : "off";
};

/** Internal adapter used only by the single provider; all Supabase calls stay here. */
export const useOwnedAccessibilityPreferences = (owner: AccessibilityPreferenceOwner, ownerKey: string): AccessibilityPreferencesContextValue => {
  const client = useQueryClient();
  const key = useMemo(() => ["accessibility", "preferences", owner.actorId ?? "device", ownerKey] as const, [owner, ownerKey]);
  const snapshot = useSyncExternalStore(owner.subscribe, owner.getSnapshot, owner.getSnapshot);
  const preflightControllers = useRef(new Set<AbortController>());

  useLayoutEffect(() => {
    const controllers = preflightControllers.current;
    owner.activate();
    const motionOwner = owner.capture();
    const motionMedia = typeof window.matchMedia === "function" ? window.matchMedia(REDUCED_MOTION_QUERY) : null;
    const synchronizeMotion = () => {
      if (owner.owns(motionOwner)) applyAccessibilityMotionPreference(owner.getSnapshot().effective.reduced_animations, motionMedia?.matches ?? false);
    };
    motionMedia?.addEventListener("change", synchronizeMotion);
    let rendered = owner.getSnapshot().effective;
    applyAccessibilityPreferences(rendered);
    const synchronize = () => {
      const next = owner.getSnapshot().effective;
      if (next !== rendered) { rendered = next; applyAccessibilityPreferences(next); }
      owner.fontRequest(fontStatus());
    };
    const unsubscribe = owner.subscribe(synchronize);
    const observer = new MutationObserver(() => owner.fontRequest(fontStatus()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-alternate-font"] });
    synchronize();
    return () => {
      unsubscribe(); observer.disconnect(); owner.deactivate();
      motionMedia?.removeEventListener("change", synchronizeMotion);
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
      void client.cancelQueries({ queryKey: key, exact: true });
      // StrictMode immediately reactivates the same owner; do not delete its query.
      queueMicrotask(() => { if (!owner.isCurrent()) client.removeQueries({ queryKey: key, exact: true }); });
      // Invalidate pending font application and release rendering, not persistence.
      applyAccessibilityPreferences(accessibilityPreferencesSchema.parse({}));
    };
  }, [client, key, owner]);

  const queryOptions = {
    queryKey: key,
    enabled: owner.actorId !== null,
    initialData: () => owner.getSnapshot().effective,
    initialDataUpdatedAt: 0,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    meta: { suppressGlobalError: true },
    queryFn: async ({ signal }: { signal: AbortSignal }): Promise<AccessibilityPreferences> => {
      if (!owner.isCurrent() || !owner.actorId) throw new CancelledError({ silent: true });
      const stamp = owner.beginRead();
      try {
        const { data, error } = await supabase.from("profiles")
          .select("id, accessibility_preferences").eq("id", owner.actorId).abortSignal(signal).maybeSingle();
        if (error) throw error;
        if (signal.aborted || !owner.owns(stamp)) throw new CancelledError({ silent: true });
        // A still-owned query superseded by preflight/ACK must settle normally,
        // not leave TanStack fetching or publish an obsolete error.
        owner.finishRead(stamp, parseAccessibilityProfile(data, owner.actorId));
        return owner.getSnapshot().effective;
      } catch (error: unknown) {
        if (!owner.owns(stamp) || signal.aborted) throw new CancelledError({ silent: true });
        if (!owner.failRead(stamp, error)) return owner.getSnapshot().effective;
        throw preferenceError(error);
      }
    },
  };
  const read = useQuery(queryOptions);
  const rawUpdate = useMutation<AccessibilityPreferences, Error, AccessibilityWriteIntent>({
    // Installed MutationObserver resets on a changed key BEFORE its pending
    // setOptions branch; a previous owner's mutation retains its closure/scope.
    mutationKey: ["accessibility", "update", ownerKey],
    scope: { id: `accessibility-preferences:${owner.actorId ?? "device"}` },
    retry: false,
    meta: { suppressGlobalError: true },
    mutationFn: async (intent) => {
      // An obsolete queued job resolves without a write, confirmation or callback.
      if (!owner.latest(intent) || !owner.actorId) return intent.prefs;
      try {
        // This read starts AFTER the per-account scope admits the job. Joining
        // the ordinary query could reuse a read from before a predecessor ACK.
        const stamp = owner.beginRead();
        const controller = new AbortController();
        preflightControllers.current.add(controller);
        try {
          const { data, error } = await supabase.from("profiles")
            .select("id, accessibility_preferences").eq("id", owner.actorId)
            .abortSignal(controller.signal).maybeSingle();
          if (!owner.latest(intent) || controller.signal.aborted) return intent.prefs;
          if (error) throw error;
          if (!owner.acceptPreflight(intent, parseAccessibilityProfile(data, owner.actorId))) return intent.prefs;
        } catch (error: unknown) {
          if (owner.latest(intent)) owner.failRead(stamp, error);
          throw error;
        } finally {
          preflightControllers.current.delete(controller);
        }
        if (!owner.latest(intent)) return intent.prefs;
        const payload = owner.payload(); // fresh known baseline + only pending field intent + unknown JSON
        client.setQueryData(key, owner.getSnapshot().effective);
        const { data, error } = await supabase.from("profiles")
          .update({ accessibility_preferences: payload }).eq("id", owner.actorId)
          .select("id, accessibility_preferences").maybeSingle();
        if (!owner.owns(intent)) return intent.prefs;
        if (error) throw error;
        const acknowledged = acknowledgeAccessibilityWrite(data, owner.actorId, payload);
        owner.confirm(intent, acknowledged);
        return acknowledged.prefs ?? intent.prefs;
      } catch (error: unknown) {
        if (!owner.latest(intent)) return intent.prefs;
        owner.failWrite(intent, error);
        throw preferenceError(error);
      }
    },
  });

  const prepare = (patch: Partial<AccessibilityPreferences>, replacement = false) => {
    const intent = owner.edit(patch, replacement);
    if (!intent) return null;
    owner.persistence(persistAccessibilityPreferencesLocal(intent.prefs));
    client.setQueryData(key, intent.prefs);
    return intent;
  };
  const callbacks = (intent: AccessibilityWriteIntent, options?: Options): MutateOptions<AccessibilityPreferences, Error, AccessibilityWriteIntent> => ({
    onSuccess: (data, _variables, result, context) => { if (owner.latest(intent)) options?.onSuccess?.(data, intent.prefs, result, context); },
    onError: (error, _variables, result, context) => { if (owner.latest(intent)) options?.onError?.(error, intent.prefs, result, context); },
    onSettled: (data, error, _variables, result, context) => { if (owner.latest(intent)) options?.onSettled?.(data, error, intent.prefs, result, context); },
  });
  const mutate = (prefs: AccessibilityPreferences, options?: Options) => {
    if (!owner.isCurrent()) return;
    const intent = prepare(accessibilityPreferencesSchema.parse(prefs), true);
    if (intent) rawUpdate.mutate(intent, callbacks(intent, options));
  };
  const mutateAsync = async (prefs: AccessibilityPreferences, options?: Options) => {
    if (!owner.isCurrent()) throw new CancelledError({ silent: true });
    const intent = prepare(accessibilityPreferencesSchema.parse(prefs), true);
    if (!intent) throw new CancelledError({ silent: true });
    const result = await rawUpdate.mutateAsync(intent, callbacks(intent, options));
    if (!owner.latest(intent)) throw new CancelledError({ silent: true });
    return result;
  };
  const retryProfileRead = async () => {
    if (!owner.isCurrent() || !owner.actorId) return;
    // QueryFn owns the current-owner error state; UI retry handlers never reject.
    try { await client.fetchQuery(queryOptions); } catch { /* surfaced by profileRead */ }
  };
  // setOptions resets on the lifecycle key in a passive effect. Do not expose
  // the preceding owner's observer snapshot during that intervening render.
  const visibleUpdate = rawUpdate.variables && !owner.owns(rawUpdate.variables) ? {
    ...rawUpdate, status: "idle" as const, isIdle: true as const,
    isPending: false as const, isSuccess: false as const, isError: false as const,
    data: undefined, variables: undefined, context: undefined, error: null,
    failureCount: 0, failureReason: null, isPaused: false, submittedAt: 0,
  } : rawUpdate;
  const update = { ...visibleUpdate, variables: visibleUpdate.variables?.prefs, mutate, mutateAsync } as UseMutationResult<AccessibilityPreferences, Error, AccessibilityPreferences>;
  return {
    read: {
      ...read,
      data: snapshot.effective,
      async refetch(options) {
        const invocation = owner.capture();
        if (!owner.owns(invocation)) throw new CancelledError({ silent: true });
        const result = await read.refetch(options);
        if (!owner.owns(invocation)) throw new CancelledError({ silent: true });
        return result;
      },
    },
    update,
    controls: {
      ...snapshot, ownerKey,
      patchLatest(patch) {
        const intent = prepare(patch);
        if (intent) rawUpdate.mutate(intent);
      },
      retryProfileRead,
      async retryAccountSync() {
        const intent = owner.retryIntent();
        if (!intent) return;
        // Preserve partial intent, rather than turning retry into a full-object
        // replacement or copying hydrated account values into device storage.
        try { await rawUpdate.mutateAsync(intent); } catch { /* surfaced by accountSync */ }
      },
      retryDevicePersistence() {
        if (!owner.isCurrent()) return false;
        const choice = owner.deviceChoice();
        if (!choice || owner.getSnapshot().devicePersistence.status !== "error") return owner.getSnapshot().devicePersistence.status === "saved";
        const outcome = persistAccessibilityPreferencesLocal(choice);
        owner.persistence(outcome);
        return outcome.saved;
      },
      retryFont() {
        if (!owner.isCurrent() || !owner.getSnapshot().effective.dyslexia_font) return;
        applyDyslexiaFont(true);
        owner.fontRequest(fontStatus());
      },
    },
  };
};
