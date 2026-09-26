import { accessibilityPreferencesSchema, type AccessibilityPreferences, type AccessibilityPersistenceOutcome } from "@/lib/accessibilityPreferences";
import type { Json } from "@/types/database";

export type FontRequestStatus = "off" | "loading" | "ready" | "error";
type Outcome<S extends string> = { status: S; error: Error | null };
export interface AccessibilityOwnerSnapshot {
  effective: AccessibilityPreferences;
  source: "device" | "profile" | "local";
  devicePersistence: Outcome<"unchanged" | "saved" | "error">;
  profileRead: Outcome<"device-only" | "pending" | "ready" | "missing" | "invalid" | "error">;
  accountSync: Outcome<"device-only" | "idle" | "pending" | "saved" | "error">;
  fontRequest: FontRequestStatus;
}
export type PreferenceDocument = { [key: string]: Json | undefined };
const fields = ["font_size", "high_contrast", "reduced_animations", "dyslexia_font", "simplified_view"] as const;
export const preferenceError = (error: unknown): Error => error instanceof Error ? error : new Error("Accessibility preference request failed");
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const json = (value: unknown): value is Json => value === null || typeof value === "string" || typeof value === "boolean"
  || (typeof value === "number" && Number.isFinite(value)) || (Array.isArray(value) ? value.every(json) : record(value) && Object.values(value).every(json));

export interface ProfilePreferenceRead {
  status: "ready" | "missing" | "invalid";
  writable: boolean;
  document: PreferenceDocument;
  prefs?: AccessibilityPreferences;
}
/** Validate only an ordinary Supabase DTO. No assumption about live schema/RLS. */
export const parseAccessibilityProfile = (row: unknown, actorId: string): ProfilePreferenceRead => {
  if (row === null) return { status: "missing", writable: false, document: {} };
  if (!record(row) || row.id !== actorId) throw new Error("Profile preference response does not belong to the requested account");
  const value = row.accessibility_preferences;
  if (value === null) return { status: "missing", writable: true, document: {} };
  if (!record(value) || !json(value)) return { status: "invalid", writable: false, document: {} };
  const parsed = accessibilityPreferencesSchema.safeParse(value);
  if (!parsed.success) return { status: "invalid", writable: false, document: {} };
  return { status: "ready", writable: true, document: { ...value }, prefs: parsed.data };
};
/** Additional server object keys are allowed; submitted leaves and array order/
 * length must survive. JSON object key order does not affect acknowledgement. */
const preservesJson = (expected: Json | undefined, actual: Json | undefined): boolean => {
  if (Array.isArray(expected)) return Array.isArray(actual) && actual.length === expected.length
    && expected.every((value, index) => preservesJson(value, actual[index]));
  if (record(expected)) return record(actual) && Object.keys(expected).every((key) =>
    Object.prototype.hasOwnProperty.call(actual, key) && preservesJson(expected[key] as Json | undefined, actual[key] as Json | undefined));
  return expected === actual;
};
export const acknowledgeAccessibilityWrite = (row: unknown, actorId: string, expected: PreferenceDocument): ProfilePreferenceRead => {
  const parsed = parseAccessibilityProfile(row, actorId);
  if (!record(row) || !record(row.accessibility_preferences) || !parsed.prefs
    || !fields.every((field) => Object.prototype.hasOwnProperty.call(row.accessibility_preferences, field) && parsed.prefs?.[field] === expected[field])
    || !preservesJson(expected, parsed.document)) {
    throw new Error("Profile did not acknowledge the complete submitted accessibility document");
  }
  return parsed;
};

let nextOwnerKey = 0;
export const allocateAccessibilityOwnerKey = (): string => `accessibility-owner-${++nextOwnerKey}`;
export interface AccessibilityWriteIntent { ownerIdentity: symbol; lease: number; revision: number; prefs: AccessibilityPreferences }
interface ReadStamp { ownerIdentity: symbol; lease: number; request: number; version: number; dirty: boolean }
type Field = keyof AccessibilityPreferences;

/** Framework-free state. Pending field intent, not device defaults, overlays a
 * fresh account baseline. React/Query/DOM/storage remain external adapters. */
export const createAccessibilityPreferenceOwner = (actorId: string | null, fallback: AccessibilityPreferences, ownsActor: () => boolean) => {
  const ownerIdentity = Symbol("accessibility-owner");
  let active = false, lease = 0, revision = 0, version = 0, readRequest = 0;
  let metadataVersion = 0, hasProfileBaseline = false;
  let deviceFallback = fallback, explicitChoice = false;
  let metadata: ProfilePreferenceRead | null = null;
  const journal = new Map<Field, { value: AccessibilityPreferences[Field]; revision: number }>();
  const overlayIntent = (base: AccessibilityPreferences) => accessibilityPreferencesSchema.parse({
    ...base, ...Object.fromEntries([...journal].map(([field, entry]) => [field, entry.value])),
  });
  let snapshot: AccessibilityOwnerSnapshot = {
    effective: fallback, source: "device", devicePersistence: { status: "unchanged", error: null },
    profileRead: { status: actorId ? "pending" : "device-only", error: null },
    accountSync: { status: actorId ? "idle" : "device-only", error: null }, fontRequest: "off",
  };
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<AccessibilityOwnerSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  };
  const current = () => active && ownsActor();
  const owns = (stamp: { ownerIdentity: symbol; lease: number }) => current() && stamp.ownerIdentity === ownerIdentity && stamp.lease === lease;
  const latest = (intent: Pick<AccessibilityWriteIntent, "ownerIdentity" | "lease" | "revision">) => owns(intent) && intent.revision === revision;
  const restoreReadStatus = () => publish({ profileRead: { status: metadata?.status ?? "ready", error: null } });
  return {
    actorId,
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    isCurrent: current,
    capture: () => ({ ownerIdentity, lease, revision }),
    owns,
    latest,
    activate() { active = true; lease++; metadata = null; return lease; },
    deactivate() { active = false; lease++; readRequest++; },
    beginRead(): ReadStamp {
      const stamp = { ownerIdentity, lease, request: ++readRequest, version, dirty: journal.size > 0 };
      if (current()) publish({ profileRead: { status: "pending", error: null } });
      return stamp;
    },
    finishRead(stamp: ReadStamp, value: ProfilePreferenceRead) {
      if (!owns(stamp) || stamp.request !== readRequest) return false;
      if (stamp.version < metadataVersion) { restoreReadStatus(); return true; }
      metadata = value;
      const patch: Partial<AccessibilityOwnerSnapshot> = { profileRead: { status: value.status, error: null } };
      if (!hasProfileBaseline && value.prefs && journal.size > 0) {
        patch.effective = overlayIntent(value.prefs);
        patch.source = "local";
      } else if (journal.size === 0 && !stamp.dirty && version === stamp.version) {
        patch.effective = value.prefs ?? deviceFallback;
        patch.source = value.prefs ? "profile" : explicitChoice ? "local" : "device";
      }
      if (value.writable) hasProfileBaseline = true;
      publish(patch);
      return true;
    },
    failRead(stamp: ReadStamp, error: unknown) {
      if (!owns(stamp) || stamp.request !== readRequest) return false;
      if (stamp.version < metadataVersion) { restoreReadStatus(); return false; }
      metadata = null;
      publish({ profileRead: { status: "error", error: preferenceError(error) } });
      return true;
    },
    edit(patch: Partial<AccessibilityPreferences>, replacement = false): AccessibilityWriteIntent | null {
      if (!current()) return null;
      const prefs = accessibilityPreferencesSchema.parse({ ...snapshot.effective, ...patch });
      revision++; version++; explicitChoice = true; deviceFallback = prefs;
      for (const field of fields) {
        if (replacement || Object.prototype.hasOwnProperty.call(patch, field)) journal.set(field, { value: prefs[field], revision });
      }
      publish({ effective: prefs, source: "local", accountSync: { status: actorId ? "pending" : "device-only", error: null } });
      return { ownerIdentity, lease, revision, prefs };
    },
    retryIntent(): AccessibilityWriteIntent | null {
      if (!current() || !actorId || journal.size === 0) return null;
      revision++; version++;
      for (const entry of journal.values()) entry.revision = revision;
      publish({ accountSync: { status: "pending", error: null } });
      return { ownerIdentity, lease, revision, prefs: snapshot.effective };
    },
    persistence(outcome: AccessibilityPersistenceOutcome) {
      if (current()) publish({ devicePersistence: { status: outcome.saved ? "saved" : "error", error: outcome.error } });
    },
    /** Called after a NEW read started inside the serialized mutation slot.
     * Never joins a query that could predate an earlier lifecycle's write. */
    acceptPreflight(intent: AccessibilityWriteIntent, value: ProfilePreferenceRead) {
      if (!latest(intent)) return false;
      metadata = value; metadataVersion = ++version;
      const patch: Partial<AccessibilityOwnerSnapshot> = { profileRead: { status: value.status, error: null } };
      if (value.writable) {
        hasProfileBaseline = true;
        patch.effective = overlayIntent(value.prefs ?? snapshot.effective);
        patch.source = "local";
      }
      publish(patch);
      return true;
    },
    deviceChoice: () => explicitChoice ? deviceFallback : null,
    payload(): PreferenceDocument {
      if (!metadata?.writable) throw new Error("Read valid owned profile settings before account sync; local preferences remain available");
      return { ...metadata.document, ...snapshot.effective };
    },
    confirm(intent: AccessibilityWriteIntent, value: ProfilePreferenceRead) {
      if (!owns(intent)) return;
      metadataVersion = ++version;
      metadata = value;
      for (const [field, entry] of journal) if (entry.revision <= intent.revision) journal.delete(field);
      if (latest(intent)) publish({ accountSync: { status: "saved", error: null } });
    },
    failWrite(intent: AccessibilityWriteIntent, error: unknown) {
      if (latest(intent)) publish({ accountSync: { status: "error", error: preferenceError(error) } });
    },
    fontRequest(status: FontRequestStatus) {
      if (current() && snapshot.fontRequest !== status) publish({ fontRequest: status });
    },
  };
};
export type AccessibilityPreferenceOwner = ReturnType<typeof createAccessibilityPreferenceOwner>;
