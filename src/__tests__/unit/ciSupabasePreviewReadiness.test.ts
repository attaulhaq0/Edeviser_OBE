import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/ci.yml"),
  "utf8"
);

describe("Supabase Preview RLS readiness gate", () => {
  it("waits for the complete branch deployment before resolving test credentials", () => {
    const readinessStep = workflow.match(
      /- name: Wait for isolated Supabase Preview deployment and resolve credentials[\s\S]*?(?=\n[ ]{6}- name:)/
    )?.[0];

    expect(readinessStep).toBeDefined();
    expect(readinessStep).toContain('$preview_status" == "FUNCTIONS_DEPLOYED"');
    expect(readinessStep).toContain(
      "Supabase Preview did not reach FUNCTIONS_DEPLOYED"
    );
  });

  it("does not export Preview credentials before the terminal deployment state", () => {
    const terminalCheck = workflow.indexOf(
      '$preview_status" == "FUNCTIONS_DEPLOYED"'
    );
    const credentialExport = workflow.indexOf(
      'echo "SUPABASE_URL=https://$preview_ref.supabase.co"'
    );

    expect(terminalCheck).toBeGreaterThan(-1);
    expect(credentialExport).toBeGreaterThan(terminalCheck);
  });
});
