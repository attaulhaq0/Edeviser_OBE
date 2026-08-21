// tests/e2e/_helpers/auth.ts
//
// Task 4.3 / Req 6.2: JWT role claim assertion + storageState loader.

import type { BrowserContext, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const STORAGE_STATES_DIR = resolve(
  "tests",
  "e2e",
  "_fixtures",
  "storage-states"
);

export type AuditRole =
  | "admin"
  | "coordinator"
  | "teacher"
  | "student"
  | "parent";

interface StoredLocalStorageEntry {
  name: string;
  value: string;
}

interface StoredOrigin {
  origin: string;
  localStorage: StoredLocalStorageEntry[];
}

interface StoredState {
  cookies: Parameters<BrowserContext["addCookies"]>[0];
  origins: StoredOrigin[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const hasAccessToken = (value: string): boolean => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) return false;
    if (typeof parsed.access_token === "string") return true;
    return (
      isRecord(parsed.session) &&
      typeof parsed.session.access_token === "string"
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

/**
 * Decode a JWT payload without verifying the signature.
 * Used only for test assertions — never for auth decisions.
 */
const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    if (!payload) return null;
    const padded = payload.padEnd(
      payload.length + ((4 - (payload.length % 4)) % 4),
      "="
    );
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
};

/**
 * Assert that the current Supabase session JWT contains the expected role
 * in either `user_metadata.role` or `app_metadata.role`.
 *
 * Reads the access token from localStorage (Supabase JS v2 key pattern).
 */
export const assertRoleClaim = async (
  page: Page,
  expectedRole: AuditRole
): Promise<void> => {
  const token = await page.evaluate((): string | null => {
    // Supabase JS v2 stores the session under sb-<ref>-auth-token
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("sb-") && key.endsWith("-auth-token")) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw) as {
            access_token?: string;
            session?: { access_token?: string };
          };
          return parsed.access_token ?? parsed.session?.access_token ?? null;
        } catch {
          continue;
        }
      }
    }
    return null;
  });

  expect(
    token,
    `Expected an authenticated ${expectedRole} session`
  ).not.toBeNull();
  if (!token) throw new Error(`Missing ${expectedRole} access token`);

  const payload = decodeJwtPayload(token);
  expect(payload, `Expected a valid JWT for ${expectedRole}`).not.toBeNull();
  if (!payload) throw new Error(`Invalid ${expectedRole} access token`);

  const role =
    (payload.user_metadata as Record<string, unknown> | undefined)?.role ??
    (payload.app_metadata as Record<string, unknown> | undefined)?.role ??
    payload.role;

  expect(role, `Expected JWT role to be "${expectedRole}"`).toBe(expectedRole);
};

/**
 * Load a role's storageState into the given context.
 * Used by cross-role specs that need to switch roles mid-test.
 */
export const loadStorageState = async (
  context: BrowserContext,
  role: AuditRole
): Promise<void> => {
  const path = resolve(STORAGE_STATES_DIR, `${role}.json`);
  if (!existsSync(path)) {
    throw new Error(`[auth] storageState for ${role} not found at ${path}`);
  }
  const state: unknown = JSON.parse(readFileSync(path, "utf8"));
  assertUsableStorageState(state, role);

  if (state.cookies.length > 0) await context.addCookies(state.cookies);
  await context.addInitScript((origins: StoredOrigin[]) => {
    const stateForOrigin = origins.find(
      ({ origin }) => origin === window.location.origin
    );
    for (const entry of stateForOrigin?.localStorage ?? []) {
      window.localStorage.setItem(entry.name, entry.value);
    }
  }, state.origins);
};
