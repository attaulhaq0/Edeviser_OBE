// tests/e2e/_fixtures/teardown.ts
//
// Task 4.2 / Req 1.7: merge persisted browser accessibility evidence, then
// clean up Preview seed data. Evidence errors fail teardown, never warn-and-pass.

import type { FullConfig } from "@playwright/test";
import { flushA11yFindings } from "../_helpers/axe-evidence.ts";

export default async function globalTeardown(config: FullConfig): Promise<void> {
  try {
    const target = flushA11yFindings({
      outputDirs: config.projects.map((project) => project.outputDir),
    });
    console.log(`[globalTeardown] a11y findings merged to ${target}`);
  } finally {
    // A broken evidence file must not prevent the existing Preview cleanup.
    await teardownSeedData();
  }
}

const teardownSeedData = async (): Promise<void> => {
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
};
