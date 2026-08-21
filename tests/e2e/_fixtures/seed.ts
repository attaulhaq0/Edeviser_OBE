// tests/e2e/_fixtures/seed.ts
//
// Task 4.1 / Req 1.7, 6.1, 6.2: Playwright globalSetup.
//
// 1. POSTs to audit-fixtures/seed to provision all 6 seed users + OBE chain.
// 2. For each role, signs in and persists storageState to
//    tests/e2e/_fixtures/storage-states/<role>.json.
// 3. Writes AUDIT_RUN_ID to process.env so globalTeardown can use it.

import { chromium, type FullConfig } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { assertRoleClaim, type AuditRole } from "../_helpers/auth.ts";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

const STORAGE_STATES_DIR = resolve(
  "tests",
  "e2e",
  "_fixtures",
  "storage-states"
);

const SEED_CREDENTIALS: Record<string, { email: string; password: string }> = {
  admin: { email: "audit+admin@edeviser.test", password: "AuditSeed2024!" },
  coordinator: {
    email: "audit+coordinator@edeviser.test",
    password: "AuditSeed2024!",
  },
  teacher: {
    email: "audit+teacher@edeviser.test",
    password: "AuditSeed2024!",
  },
  student: {
    email: "audit+student@edeviser.test",
    password: "AuditSeed2024!",
  },
  parent: {
    email: "audit+parent-linked@edeviser.test",
    password: "AuditSeed2024!",
  },
};

const writeEmptyStorageStates = (): void => {
  mkdirSync(STORAGE_STATES_DIR, { recursive: true });
  for (const role of Object.keys(SEED_CREDENTIALS)) {
    writeFileSync(
      resolve(STORAGE_STATES_DIR, `${role}.json`),
      JSON.stringify({ cookies: [], origins: [] }),
      "utf8"
    );
  }
};

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const isPreviewFixtureRun =
    process.env.E2E_FIXTURES_ENABLED === "true" &&
    process.env.SUPABASE_DB_ENV === "preview";
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!isPreviewFixtureRun || !supabaseUrl || !anonKey) {
    console.warn(
      "[globalSetup] E2E fixtures are disabled. Set E2E_FIXTURES_ENABLED=true, SUPABASE_DB_ENV=preview, VITE_SUPABASE_URL, and VITE_SUPABASE_ANON_KEY to run against a preview database."
    );
    writeEmptyStorageStates();
    return;
  }

  const runId = randomUUID();
  process.env.AUDIT_RUN_ID = runId;
  const auditFixturesUrl = `${supabaseUrl}/functions/v1/audit-fixtures`;

  mkdirSync(STORAGE_STATES_DIR, { recursive: true });

  // Step 1: Provision seed data via audit-fixtures Edge Function. Preview
  // audit runs are invalid unless the fixture is fully provisioned.
  const seedRes = await fetch(`${auditFixturesUrl}/seed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify({
      runId,
      roles: ["admin", "coordinator", "teacher", "student", "parent"],
    }),
  });
  if (!seedRes.ok) {
    const responseText = await seedRes.text();
    throw new Error(
      `[globalSetup] audit-fixtures/seed returned ${
        seedRes.status
      }: ${responseText.slice(0, 500)}`
    );
  }

  const seedData: unknown = await seedRes.json();
  if (
    typeof seedData !== "object" ||
    seedData === null ||
    !("ok" in seedData) ||
    seedData.ok !== true
  ) {
    throw new Error(
      `[globalSetup] audit-fixtures/seed reported an incomplete seed: ${JSON.stringify(
        seedData
      )}`
    );
  }
  console.log(`[globalSetup] Seed complete. runId=${runId}`);

  // Step 2: Sign in as each role and persist storageState.
  const browser = await chromium.launch();

  for (const [role, creds] of Object.entries(SEED_CREDENTIALS)) {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Navigate to login page
      await page.goto(`${BASE_URL}/login`, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });

      // Fill credentials
      await page
        .locator('input[type="email"], input[name="email"]')
        .fill(creds.email);
      await page
        .locator('input[type="password"], input[name="password"]')
        .fill(creds.password);
      await page
        .locator(
          'button[type="submit"], button:has-text("Sign in"), button:has-text("Login")'
        )
        .click();

      // Wait for redirect away from login
      await page.waitForURL((url) => !url.pathname.includes("/login"), {
        timeout: 15_000,
      });
      await assertRoleClaim(page, role as AuditRole);

      const storageStatePath = resolve(STORAGE_STATES_DIR, `${role}.json`);
      await context.storageState({ path: storageStatePath });
      console.log(`[globalSetup] ${role}: storageState saved`);
    } finally {
      await context.close();
    }
  }

  await browser.close();
}
