// @vitest-environment node
// Synthetic fixture only: NEVER execute the historical full-source/PDF export.
import { afterEach, describe, expect, it } from "vitest";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  buildReview,
  parseInventory,
  runReview,
} from "../../../scripts/generate-codebase-review-pack.mjs";

const fixtureLedger = `# Synthetic audit
## Complete declared-route migration inventory — source only
| Inventory ID | Path (source line) | Route owner | Caveat | Status |
| --- | --- | --- | --- | --- |
| route-admin-001 | \`/admin\` (L10) | Local fixture | CANARY_SECRET_NOT_FOR_EXPORT | SOURCE_INVENTORIED |
| route-public-001 | \`/accept-invite/:token\` (L20) | Local fixture | Never include token values | SOURCE_INVENTORIED |
| route-layout-admin | \`/admin/*\`, L8 | Local fixture | Layout only | SOURCE_INVENTORIED |
| route-surface-route-loading | Whole Routes tree | Local fixture | Not a route leaf | SOURCE_INVENTORIED |
### Coverage boundary and next matrix expansion
`;
const scratch: string[] = [];
const fixture = (source = fixtureLedger) => {
  const owner = mkdtempSync(join(tmpdir(), "edeviser-review-unit-"));
  scratch.push(owner);
  const root = join(owner, "repo");
  const audit = join(root, "docs", "audits");
  mkdirSync(audit, { recursive: true });
  writeFileSync(
    join(audit, "frontend-forensic-remediation-ledger.md"),
    source,
    "utf8"
  );
  return { root, owner, out: join(owner, "edeviser-review-fixture") };
};
afterEach(() => {
  for (const path of scratch.splice(0))
    rmSync(path, { recursive: true, force: true });
});

describe("V16 bounded codebase review preparation", () => {
  it("separates source inventory from unexecuted verification, with all four statuses explicit", () => {
    const rows = parseInventory(fixtureLedger);
    expect(rows).toHaveLength(4);
    expect(rows.map((item) => item.kind)).toEqual([
      "leaf",
      "layout",
      "leaf",
      "supplemental",
    ]);
    const report = buildReview(fixtureLedger);
    expect(report.routeCounts).toEqual({ leaf: 2, layout: 1, supplemental: 1 });
    expect(report.verificationCounts).toEqual({
      verified: 0,
      unverified: 4,
      skipped: 0,
      failed: 0,
    });
    expect(report.checksExecuted).toBe(0);
    expect(
      buildReview(fixtureLedger.replace(/\n/g, "\r\n")).source.sha256
    ).toBe(report.source.sha256);
    expect(report.readiness.deployed).toBe("not_tested");
    expect(
      report.routes.every((row) => row.verificationStatus === "unverified")
    ).toBe(true);
  });

  it("writes only bounded manifest, route-status CSV and honest report outside the repo", () => {
    const { root, out } = fixture();
    const legacy = join(root, "docs", "codebase-review-pack");
    mkdirSync(legacy);
    const historical = join(legacy, "generation-report.md");
    writeFileSync(
      historical,
      "Historical Finalized claim; not an approved result",
      "utf8"
    );
    expect(runReview({ root, out })).toMatchObject({
      checksExecuted: 0,
      counts: { leaf: 2 },
    });
    const manifest = readFileSync(join(out, "manifest.json"), "utf8");
    const summary = readFileSync(join(out, "generation-report.md"), "utf8");
    const csv = readFileSync(join(out, "route-status.csv"), "utf8");
    expect(manifest).toContain('"verified": 0');
    expect(manifest).toContain('"unverified": 4');
    expect(csv).toContain('"/accept-invite/:token"');
    expect(csv).toContain('"unverified"');
    expect(summary).toContain("0 checks");
    expect(summary).toContain("zero failed count has no passing-test meaning");
    expect(manifest + summary + csv).not.toContain(
      "CANARY_SECRET_NOT_FOR_EXPORT"
    );
    expect(manifest + summary + csv).not.toMatch(
      /Secrets Redacted: Yes|100% GREEN|Finalized Prototype/
    );
    expect(readFileSync(historical, "utf8")).toContain(
      "Historical Finalized claim"
    );
    expect(existsSync(join(out, "Edeviser-Complete-Codebase.pdf"))).toBe(false);
  });

  it("fails before writing on missing output, existing output or in-repo output", () => {
    const { root, out } = fixture();
    expect(() => runReview({ root })).toThrow("--out must");
    expect(() =>
      runReview({ root, out: join(root, "edeviser-review-inrepo") })
    ).toThrow("separate from the repository");
    mkdirSync(out);
    const marker = join(out, "owner.txt");
    writeFileSync(marker, "preserve", "utf8");
    expect(() => runReview({ root, out })).toThrow("Output exists");
    expect(readFileSync(marker, "utf8")).toBe("preserve");
  });

  it("rejects malformed, duplicated, unsupported or missing route evidence", () => {
    expect(() => parseInventory("")).toThrow("missing or empty");
    expect(() => parseInventory("# No inventory section")).toThrow(
      "boundaries"
    );
    expect(() =>
      parseInventory(fixtureLedger.replace("SOURCE_INVENTORIED", "VERIFIED"))
    ).toThrow("Unreviewed inventory status");
    const duplicate = fixtureLedger.replace(
      "### Coverage boundary",
      "| route-admin-001 | `/admin/copy` | Copy | Duplicate | SOURCE_INVENTORIED |\n### Coverage boundary"
    );
    expect(() => parseInventory(duplicate)).toThrow("duplicate inventory id");
    const { root, out } = fixture("# Broken source without rows");
    expect(() => runReview({ root, out })).toThrow("boundaries");
    expect(existsSync(out)).toBe(false);
  });

  it("treats the current ledger as a source-only, not a rendered-route certificate", () => {
    const root = resolve(__dirname, "../../..");
    const ledger = readFileSync(
      join(root, "docs", "audits", "frontend-forensic-remediation-ledger.md"),
      "utf8"
    );
    const summary = buildReview(ledger);
    expect(summary.routeCounts.leaf).toBe(212);
    expect(summary.routeCounts.layout).toBe(5);
    expect(summary.verificationCounts.verified).toBe(0);
    expect(summary.verificationCounts.unverified).toBe(summary.routes.length);
  });
});
