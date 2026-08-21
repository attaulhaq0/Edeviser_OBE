import { existsSync, readFileSync } from "node:fs";

export type AuditRole =
  | "admin"
  | "coordinator"
  | "teacher"
  | "student"
  | "parent";

export interface StoredLocalStorageEntry {
  name: string;
  value: string;
}

export interface StoredOrigin {
  origin: string;
  localStorage: StoredLocalStorageEntry[];
}

export interface StoredState {
  cookies: unknown[];
  origins: StoredOrigin[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const hasAccessToken = (value: string): boolean => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) return false;
    if (typeof parsed.access_token === "string" && parsed.access_token) {
      return true;
    }
    return (
      isRecord(parsed.session) &&
      typeof parsed.session.access_token === "string" &&
      Boolean(parsed.session.access_token)
    );
  } catch {
    return false;
  }
};

export function assertUsableStorageState(
  value: unknown,
  role: AuditRole
): asserts value is StoredState {
  if (!isRecord(value) || !Array.isArray(value.cookies)) {
    throw new Error(`[auth] ${role} storageState has an invalid cookie list`);
  }
  if (!Array.isArray(value.origins)) {
    throw new Error(`[auth] ${role} storageState has an invalid origin list`);
  }

  const hasSupabaseSession = value.origins.some((origin) => {
    if (!isRecord(origin) || !Array.isArray(origin.localStorage)) return false;
    return origin.localStorage.some(
      (entry) =>
        isRecord(entry) &&
        typeof entry.name === "string" &&
        typeof entry.value === "string" &&
        entry.name.startsWith("sb-") &&
        entry.name.endsWith("-auth-token") &&
        hasAccessToken(entry.value)
    );
  });

  if (!hasSupabaseSession) {
    throw new Error(
      `[auth] ${role} storageState does not contain a Supabase session`
    );
  }
}

export const readStorageStateFile = (
  path: string,
  role: AuditRole
): StoredState => {
  if (!existsSync(path)) {
    throw new Error(`[auth] storageState for ${role} not found at ${path}`);
  }

  const raw = readFileSync(path, "utf8");
  if (!raw.trim()) {
    throw new Error(`[auth] storageState for ${role} is empty`);
  }

  let state: unknown;
  try {
    state = JSON.parse(raw);
  } catch {
    throw new Error(`[auth] storageState for ${role} is not valid JSON`);
  }
  assertUsableStorageState(state, role);
  return state;
};

export const decodeJwtPayload = (
  token: string
): Record<string, unknown> | null => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    if (!payload) return null;
    const padded = payload.padEnd(
      payload.length + ((4 - (payload.length % 4)) % 4),
      "="
    );
    const decoded: unknown = JSON.parse(
      Buffer.from(padded, "base64url").toString("utf8")
    );
    return isRecord(decoded) ? decoded : null;
  } catch {
    return null;
  }
};

/**
 * Test assertion only. Decoded claims are never used to authorize an action;
 * live E2E scope is established independently through Supabase Auth /user.
 */
export const assertJwtRole = (token: string, expectedRole: AuditRole): void => {
  const payload = decodeJwtPayload(token);
  if (!payload) throw new Error(`Invalid ${expectedRole} access token`);

  const appMetadata = isRecord(payload.app_metadata)
    ? payload.app_metadata
    : null;
  if (!appMetadata || typeof appMetadata.role !== "string") {
    throw new Error(`JWT is missing an app_metadata role claim`);
  }
  if (appMetadata.role !== expectedRole) {
    throw new Error(
      `Expected JWT role "${expectedRole}", received "${appMetadata.role}"`
    );
  }
};
