// tests/e2e/_fixtures/seed.ts
//
// Task 4.1 / Req 1.7, 6.1, 6.2: Playwright globalSetup.
//
// 1. POSTs to audit-fixtures/seed to provision all 6 seed users + OBE chain.
// 2. For each role, signs in and persists storageState to
//    tests/e2e/_fixtures/storage-states/<role>.json.
// 3. Writes AUDIT_RUN_ID to process.env so globalTeardown can use it.

import { chromium, type FullConfig } from "@playwright/test";
import { lstatSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import {
  assertLiveAuthenticatedUser,
  assertRoleClaim,
  type AuditRole,
} from "../_helpers/auth.ts";
import {
  fixtureProjectMode,
  verifyGitLinkedPreview,
} from "../_helpers/previewFixtureTarget.ts";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const AUDIT_INSTITUTION_ID = "a1b2c3d4-e5f6-4a7b-8c9d-000000000001";

const STORAGE_STATES_DIR = resolve(
  "tests",
  "e2e",
  "_fixtures",
  "storage-states"
);

interface SeedCredential {
  storageName: string;
  role: AuditRole;
  email: string;
  password: string;
}

const SEED_CREDENTIALS: SeedCredential[] = [
  {
    storageName: "admin",
    role: "admin",
    email: "audit+admin@edeviser.test",
    password: "AuditSeed2024!",
  },
  {
    storageName: "coordinator",
    role: "coordinator",
    email: "audit+coordinator@edeviser.test",
    password: "AuditSeed2024!",
  },
  {
    storageName: "teacher",
    role: "teacher",
    email: "audit+teacher@edeviser.test",
    password: "AuditSeed2024!",
  },
  {
    storageName: "student",
    role: "student",
    email: "audit+student@edeviser.test",
    password: "AuditSeed2024!",
  },
  {
    storageName: "parent",
    role: "parent",
    email: "audit+parent-linked@edeviser.test",
    password: "AuditSeed2024!",
  },
  {
    storageName: "parent-unlinked",
    role: "parent",
    email: "audit+parent-unlinked@edeviser.test",
    password: "AuditSeed2024!",
  },
];

export default async function globalSetup(config: FullConfig): Promise<void> {
  // Never reinterpret a previous process run id as evidence for this setup.
  delete process.env.AUDIT_FIXTURE_STARTED;
  delete process.env.AUDIT_PREVIEW_REF;
  delete process.env.AUDIT_RUN_ID;
  const selected = fixtureProjectMode(
    config.projects.map((project) => project.name)
  );
  if (selected === "legacy") {
    console.log(
      "[globalSetup] Legacy smoke selected; no role states or Preview fixtures created"
    );
    return;
  }

  // This read-only Management API lookup must independently match BOTH the PR
  // branch and number before creating a directory, posting seed, or opening Chrome.
  const target = await verifyGitLinkedPreview(process.env);
  const appUrl = new URL(BASE_URL);
  if (
    appUrl.protocol !== "http:" ||
    !["localhost", "127.0.0.1"].includes(appUrl.hostname) ||
    appUrl.port !== "5173" ||
    appUrl.pathname !== "/" ||
    appUrl.username ||
    appUrl.password
  )
    throw new Error(
      "Audit application URL must be the controlled local Vite origin"
    );

  const prior = lstatSync(STORAGE_STATES_DIR, { throwIfNoEntry: false });
  if (prior && (!prior.isDirectory() || prior.isSymbolicLink()))
    throw new Error(
      "Role storage-state directory is not a normal owned directory"
    );
  for (const { storageName } of SEED_CREDENTIALS) {
    if (
      lstatSync(resolve(STORAGE_STATES_DIR, `${storageName}.json`), {
        throwIfNoEntry: false,
      })
    )
      throw new Error(
        "Existing authenticated role state must be preserved; use a fresh isolated worktree"
      );
  }

  const runId = randomUUID();
  process.env.AUDIT_RUN_ID = runId;
  process.env.AUDIT_PREVIEW_REF = target.ref;
  process.env.AUDIT_PREVIEW_BRANCH = target.branch;
  process.env.AUDIT_PREVIEW_PR_NUMBER = target.prNumber;
  process.env.AUDIT_FIXTURE_STARTED = "true";
  const supabaseUrl = target.url;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY!;
  const auditFixturesUrl = `${supabaseUrl}/functions/v1/audit-fixtures`;

  mkdirSync(STORAGE_STATES_DIR, { recursive: true });
  // Step 1: Preview fixture runs are invalid unless every requested entity is
  // provisioned. A missing fixture capability is a hard failure, never a skip.
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
    throw new Error(
      `[globalSetup] audit-fixtures/seed returned HTTP ${seedRes.status}`
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
      "[globalSetup] audit-fixtures/seed reported an incomplete response"
    );
  }
  console.log(
    "[globalSetup] Preview fixture seed acknowledged for verified Git-linked branch"
  );

  // Step 2: Sign in as each role and persist storageState.
  const browser = await chromium.launch();
  try {
    for (const credential of SEED_CREDENTIALS) {
      const { storageName, role, email, password } = credential;
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
          .fill(email);
        await page
          .locator('input[type="password"], input[name="password"]')
          .fill(password);
        await page
          .locator('form:has(#login-password) button[type="submit"]')
          .click();

        // Wait for redirect away from login
        await page.waitForURL((url) => !url.pathname.includes("/login"), {
          timeout: 15_000,
        });
        await assertRoleClaim(page, role);
        await assertLiveAuthenticatedUser(page, {
          role,
          email,
          institutionId: AUDIT_INSTITUTION_ID,
        });

        const storageStatePath = resolve(
          STORAGE_STATES_DIR,
          `${storageName}.json`
        );
        await context.storageState({ path: storageStatePath });
        console.log(
          `[globalSetup] ${storageName}: authenticated storageState saved`
        );
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}
