// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { analyzeRepository, compareRepositories, parseArguments } from "../../../scripts/design-policy/repository.mjs";

const roots: string[] = [];
const root = () => { const path = mkdtempSync(join(tmpdir(), "edeviser-policy-")); roots.push(path); return path; };
const put = (base: string, file: string, value: string) => { const path = join(base, file); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, value); return path; };
// Complete utility candidates are assembled only at runtime, not seeded into CSS.
const paint = ["bg", "red", 500].join("-");
const component = (classes = "text-foreground") => `export function Example(){return <div className=${JSON.stringify(classes)}>Example</div>}`;
afterEach(() => { for (const path of roots.splice(0)) rmSync(path, { recursive: true, force: true }); });

describe("read-only authored-source policy adapter", () => {
  it("reads source without evaluating it or modifying it", () => {
    const base = root();
    const text = `${component(paint)}\nthrow new Error('must never execute');`;
    const file = put(base, "src/Example.tsx", text);
    const result = analyzeRepository(base);
    expect(result.sourceCount).toBe(1);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.file).toBe("src/Example.tsx");
    expect(readFileSync(file, "utf8")).toBe(text);
    expect(result.scope).toContain("runtime reachability is not inferred");
  });
  it("makes generated/test exclusions explicit, not inferred compliance", () => {
    const base = root(); put(base, "src/Example.tsx", component());
    for (const file of ["src/components/ui/button.tsx", "src/__tests__/probe.tsx", "src/features/x/view.test.tsx", "src/features/x/view.spec.ts", "src/types/extra.d.ts"]) put(base, file, "invalid source !");
    const report = analyzeRepository(base);
    expect(report.sourceCount).toBe(1);
    expect(report.findings).toEqual([]);
    expect(report.excludedScopes).toHaveLength(3);
  });
  it("does not silently omit dormant authored modules or stories", () => {
    const base = root(); put(base, "src/DormantNew.tsx", component(paint)); put(base, "src/Card.stories.tsx", component(paint));
    expect(analyzeRepository(base).findings).toHaveLength(2);
  });
  it("rejects missing/empty source scope instead of giving an empty pass", () => {
    const base = root(); expect(() => analyzeRepository(base)).toThrow();
    mkdirSync(join(base, "src")); expect(() => analyzeRepository(base)).toThrow("No authored TypeScript sources");
  });
  it("fails closed on malformed included source", () => {
    const base = root(); put(base, "src/Broken.tsx", "export const X = <div>");
    expect(() => analyzeRepository(base)).toThrow("syntax error");
  });
  it("rejects source directory links instead of traversing another owner", () => {
    const base = root(), outside = root(); put(base, "src/Example.tsx", component()); put(outside, "Secret.tsx", component(paint));
    symlinkSync(outside, join(base, "src", "linked"), process.platform === "win32" ? "junction" : "dir");
    expect(() => analyzeRepository(base)).toThrow("Source links require");
  });
  it("retains existing debt in a no-growth comparison and detects added copies", () => {
    const before = root(), after = root(); put(before, "src/Example.tsx", component(paint)); put(after, "src/Example.tsx", component(paint));
    const unchanged = compareRepositories(before, after);
    expect(unchanged.verdict).toBe("no-growth"); expect(unchanged.comparison.totals.existing).toBe(1);
    put(after, "src/Example.tsx", component(`${paint} ${paint}`));
    const added = compareRepositories(before, after);
    expect(added.verdict).toBe("growth"); expect(added.comparison.totals.introduced).toBe(1);
  });
  it("accounts for removed debt without approving the remaining source", () => {
    const before = root(), after = root(); put(before, "src/Example.tsx", component(paint)); put(after, "src/Example.tsx", component());
    const result = compareRepositories(before, after);
    expect(result.comparison.totals.removed).toBe(1);
    expect(result.limitations.some((limit) => limit.includes("not clean design"))).toBe(true);
  });
  it("rejects the same physical checkout as its own baseline", () => {
    const base = root(); put(base, "src/Example.tsx", component());
    expect(() => compareRepositories(base, base)).toThrow("distinct checkouts");
  });
});

describe("explicit policy command modes", () => {
  it("requires explicit report or no-growth modes and roots", () => {
    expect(parseArguments(["--report", "--root", "."])).toEqual({ mode: "--report", root: ".", baseRoot: undefined });
    expect(parseArguments(["--check-no-growth", "--root", ".", "--base-root", "baseline"])).toEqual({ mode: "--check-no-growth", root: ".", baseRoot: "baseline" });
  });
  const invalidArguments: string[][] = [[], ["--report"], ["--check-no-growth", "--root", "."], ["--report", "--root", ".", "--base-root", "baseline"], ["--report", "--root", ".", "--root", "other"], ["--approve", "--root", "."]];
  it.each(invalidArguments.map((args) => ({ args })))("rejects ambiguous or approval-shaped arguments $args", ({ args }) => {
    expect(() => parseArguments(args)).toThrow();
  });
});
