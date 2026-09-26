// Pure setup, independent of Preview fixture provisioning. Playwright passes
// globalSetup environment changes to workers and globalTeardown.
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { setAxeRunId } from "../_helpers/axe-evidence.ts";

export default async function setupA11yEvidence(): Promise<void> {
  setAxeRunId(randomUUID());
  // If this run fails before merging, the report must not consume a prior
  // run's browser evidence. The independent static artifact is never touched.
  rmSync(resolve("audit", "output", "a11y-findings.json"), { force: true });
}
