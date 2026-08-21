// tests/e2e/_helpers/auth.ts
//
// Task 4.3 / Req 6.2: JWT role claim assertion + storageState loader.

import type { BrowserContext, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { resolve } from "node:path";
import {
  assertJwtRole,
  readStorageStateFile,
  type AuditRole,
  type StoredOrigin,
} from "./authContracts.ts";

export {
  assertJwtRole,
  assertUsableStorageState,
  decodeJwtPayload,
  readStorageStateFile,
} from "./authContracts.ts";
export type { AuditRole } from "./authContracts.ts";

const STORAGE_STATES_DIR = resolve(
  "tests",
  "e2e",
  "_fixtures",
  "storage-states"
);

const readAccessToken = async (page: Page): Promise<string | null> =>
  page.evaluate((): string | null => {
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
  const token = await readAccessToken(page);
  expect(
    token,
    `Expected an authenticated ${expectedRole} session`
  ).not.toBeNull();
  if (!token) throw new Error(`Missing ${expectedRole} access token`);
  assertJwtRole(token, expectedRole);
};

interface LiveAuthExpectation {
  role: AuditRole;
  email?: string;
  institutionId?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * Proves the persisted token is accepted by Supabase Auth. Unlike decoding a
 * local JWT, GET /auth/v1/user performs a network validation and returns the
 * authentic user. Authorization scope is checked only from app_metadata.
 */
export const assertLiveAuthenticatedUser = async (
  page: Page,
  expected: LiveAuthExpectation
): Promise<void> => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Live Supabase Auth verification requires Preview credentials"
    );
  }

  const token = await readAccessToken(page);
  if (!token) throw new Error(`Missing ${expected.role} access token`);

  const response = await page.request.get(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  if (!response.ok()) {
    throw new Error(
      `Supabase Auth rejected ${
        expected.role
      } session with HTTP ${response.status()}`
    );
  }

  const user: unknown = await response.json();
  if (!isRecord(user) || typeof user.id !== "string") {
    throw new Error(`Supabase Auth returned an invalid ${expected.role} user`);
  }
  const appMetadata = isRecord(user.app_metadata) ? user.app_metadata : null;
  expect(appMetadata?.role, "Live user app_metadata role").toBe(expected.role);
  if (expected.email)
    expect(user.email, "Live user email").toBe(expected.email);
  if (expected.institutionId) {
    expect(
      appMetadata?.institution_id,
      "Live user app_metadata institution scope"
    ).toBe(expected.institutionId);
  }
};

export const authenticatedSupabaseGet = async (
  page: Page,
  path: string
): Promise<unknown> => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Authenticated Supabase request requires Preview credentials"
    );
  }
  if (!path.startsWith("/")) {
    throw new Error("Authenticated Supabase request path must start with /");
  }
  const token = await readAccessToken(page);
  if (!token)
    throw new Error("Authenticated Supabase request is missing a token");

  const response = await page.request.get(`${supabaseUrl}${path}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  if (!response.ok()) {
    throw new Error(
      `Authenticated Supabase GET ${path} failed with HTTP ${response.status()}`
    );
  }
  return response.json();
};

/**
 * Load a role's storageState into the given context.
 * Used by cross-role specs that need to switch roles mid-test.
 */
export const loadStorageState = async (
  context: BrowserContext,
  role: AuditRole,
  variant?: "unlinked"
): Promise<void> => {
  const storageName = variant ? `${role}-${variant}` : role;
  const path = resolve(STORAGE_STATES_DIR, `${storageName}.json`);
  const state = readStorageStateFile(path, role);
  if (state.cookies.length > 0) {
    await context.addCookies(
      state.cookies as Parameters<typeof context.addCookies>[0]
    );
  }
  await context.addInitScript((origins: StoredOrigin[]) => {
    const stateForOrigin = origins.find(
      ({ origin }) => origin === window.location.origin
    );
    for (const entry of stateForOrigin?.localStorage ?? []) {
      window.localStorage.setItem(entry.name, entry.value);
    }
  }, state.origins);
};
