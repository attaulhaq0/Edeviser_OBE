// tests/e2e/_fixtures/teardown.ts
//
// Task 4.2 / Req 1.7: merge persisted browser accessibility evidence, then
// clean up Preview seed data. Evidence errors fail teardown, never warn-and-pass.

import type { FullConfig } from "@playwright/test";
import { flushA11yFindings } from "../_helpers/axe-evidence.ts";
import {
  verifyGitLinkedPreview,
  type PreviewFixtureEnvironment,
} from "../_helpers/previewFixtureTarget.ts";

export default async function globalTeardown(
  config: FullConfig
): Promise<void> {
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

interface FixtureLifecycleEnvironment extends PreviewFixtureEnvironment {
  AUDIT_FIXTURE_STARTED?: string;
  AUDIT_RUN_ID?: string;
  AUDIT_PREVIEW_REF?: string;
  AUDIT_PREVIEW_BRANCH?: string;
  AUDIT_PREVIEW_PR_NUMBER?: string;
}

/** A run-id by itself never authorizes deletion. No live call without matching PR. */
export const teardownSeedData = async (
  env: FixtureLifecycleEnvironment = process.env,
  fetchTarget: typeof fetch = fetch
): Promise<void> => {
  if (env.AUDIT_FIXTURE_STARTED !== "true") {
    console.log(
      "[globalTeardown] No Preview fixture started by this setup; no deletion requested"
    );
    return;
  }
  const runId = env.AUDIT_RUN_ID;
  if (
    !runId ||
    !env.AUDIT_PREVIEW_REF ||
    !env.AUDIT_PREVIEW_BRANCH ||
    !env.AUDIT_PREVIEW_PR_NUMBER
  )
    throw new Error(
      "Missing owned fixture run identity; refusing Preview teardown"
    );

  const target = await verifyGitLinkedPreview(env, fetchTarget);
  if (
    target.ref !== env.AUDIT_PREVIEW_REF ||
    target.branch !== env.AUDIT_PREVIEW_BRANCH ||
    target.prNumber !== env.AUDIT_PREVIEW_PR_NUMBER
  )
    throw new Error("Preview identity changed since seed; refusing teardown");

  const res = await fetchTarget(
    `${target.url}/functions/v1/audit-fixtures/teardown`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
        apikey: env.VITE_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ runId }),
    }
  );
  if (!res.ok)
    throw new Error(
      `[globalTeardown] audit-fixtures/teardown returned HTTP ${res.status}`
    );
  console.log("[globalTeardown] Owned Preview fixture cleanup acknowledged");
};
