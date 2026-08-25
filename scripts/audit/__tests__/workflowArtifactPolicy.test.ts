import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/pre-deploy-audit.yml"),
  "utf8"
);

describe("pre-deployment audit artifact policy", () => {
  it("does not download optional artifacts when their producer is skipped", () => {
    expect(workflow).toMatch(
      /Download connectivity matrix\r?\n\s+if: needs\.connectivity\.result != 'skipped'/
    );
    expect(workflow).toMatch(
      /Download RLS matrix\r?\n\s+if: needs\.rls\.result != 'skipped'/
    );
    expect(workflow).toMatch(
      /Download cron health\r?\n\s+if: needs\.cron\.result != 'skipped'/
    );
    expect(workflow).toMatch(
      /Download Nova Act logs\r?\n\s+if: (needs\.nova-act|needs\['nova-act'\])\.result != 'skipped'/
    );
  });

  it("keeps required security and static artifacts fail-fast", () => {
    const securityBlock = workflow.match(
      /Download security findings[\s\S]*?Download static findings/
    )?.[0];
    const staticBlock = workflow.match(
      /Download static findings[\s\S]*?Download connectivity matrix/
    )?.[0];
    expect(securityBlock).toBeDefined();
    expect(staticBlock).toBeDefined();
    expect(securityBlock).not.toContain("continue-on-error");
    expect(staticBlock).not.toContain("continue-on-error");
  });
});
