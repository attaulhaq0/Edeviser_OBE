// tests/e2e/_fixtures/teardown.ts
//
// Task 4.2 / Req 1.7: Playwright globalTeardown.
//
// 1. Flushes the axe-core a11y findings buffer to audit/output/a11y-findings.json.
// 2. POSTs to audit-fixtures/teardown with the runId from globalSetup.

import type { FullConfig } from "@playwright/test";
import { flushA11yFindings } from "../_helpers/axe.ts";

export default async function globalTeardown(
  _config: FullConfig
): Promise<void> {
  // Task 15.1: Flush axe-core findings buffer → audit/output/a11y-findings.json
  try {
    const target = flushA11yFindings();
    console.log(`[globalTeardown] a11y findings flushed to ${target}`);
  } catch (err) {
    console.warn(
      `[globalTeardown] Could not flush a11y findings: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  // Teardown seed data
  const runId = process.env.AUDIT_RUN_ID;
  if (!runId) {
    console.warn("[globalTeardown] AUDIT_RUN_ID not set — skipping teardown");
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (
    process.env.E2E_FIXTURES_ENABLED !== "true" ||
    process.env.SUPABASE_DB_ENV !== "preview" ||
    !supabaseUrl ||
    !anonKey
  ) {
    console.warn(
      "[globalTeardown] Preview E2E fixture guard is not satisfied — skipping teardown"
    );
    return;
  }

  const auditFixturesUrl = `${supabaseUrl}/functions/v1/audit-fixtures`;

  try {
    const res = await fetch(`${auditFixturesUrl}/teardown`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ runId }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn(
        `[globalTeardown] teardown returned ${res.status}: ${text.slice(
          0,
          200
        )}`
      );
    } else {
      console.log(`[globalTeardown] Teardown complete. runId=${runId}`);
    }
  } catch (err) {
    console.warn(
      `[globalTeardown] Could not reach audit-fixtures teardown: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}
