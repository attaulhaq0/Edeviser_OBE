// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { summarizeRepositories } from "../../../scripts/design-policy/summary.mjs";

const roots: string[] = [];
const root = () => {
  const path = mkdtempSync(join(tmpdir(), "edeviser-policy-summary-"));
  roots.push(path);
  return path;
};
const put = (base: string, path: string, content: string) => {
  const target = join(base, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
  return target;
};
const paint = ["bg", "red", "500"].join("-");
const source = (classes: string) =>
  `export function Example(){return <div className=${JSON.stringify(
    classes
  )}>Example</div>}`;
afterEach(() => {
  for (const path of roots.splice(0))
    rmSync(path, { recursive: true, force: true });
});

describe("explicit-checkout read-only design-policy summary", () => {
  it("detects one new copy even when another real issue was removed", () => {
    const before = root(),
      after = root();
    const baseFile = put(
      before,
      "src/Example.tsx",
      source(`${paint} text-blue-600`)
    );
    const currentFile = put(
      after,
      "src/Example.tsx",
      source(`${paint} ${paint}`)
    );
    const result = summarizeRepositories(before, after);
    expect(result.mode).toBe("check-no-growth");
    expect(result.verdict).toBe("growth");
    expect(result.totals).toMatchObject({
      introduced: 1,
      removed: 1,
      existing: 1,
    });
    expect(result.introduced).toEqual([
      {
        file: "src/Example.tsx",
        owner: "Example",
        rule: "numbered-palette",
        token: paint,
        count: 1,
      },
    ]);
    expect(readFileSync(baseFile, "utf8")).toBe(
      source(`${paint} text-blue-600`)
    );
    expect(readFileSync(currentFile, "utf8")).toBe(source(`${paint} ${paint}`));
  });

  it("retains and reports pre-existing debt without approving it", () => {
    const before = root(),
      after = root();
    put(before, "src/Example.tsx", source(paint));
    put(after, "src/Example.tsx", source(paint));
    const summary = summarizeRepositories(before, after);
    expect(summary.verdict).toBe("no-growth");
    expect(summary.totals).toMatchObject({ introduced: 0, existing: 1 });
    expect(
      summary.limitations.some((line) => line.includes("not clean design"))
    ).toBe(true);
    expect(
      summary.excludedScopes.some((item) => item.path === "src/components/ui/")
    ).toBe(true);
  });

  it("caps diagnostics while keeping exact introduced totals", () => {
    const before = root(),
      after = root();
    put(before, "src/Existing.tsx", source("text-foreground"));
    put(after, "src/Existing.tsx", source("text-foreground"));
    for (let index = 0; index < 7; index++)
      put(after, `src/Example${index}.tsx`, source(paint));
    const result = summarizeRepositories(before, after);
    expect(result.verdict).toBe("growth");
    expect(result.totals.introduced).toBe(7);
    expect(result.introduced).toHaveLength(5);
    expect(result.omittedIntroducedGroups).toBe(2);
  });

  it("fails closed on same-root, missing or syntactically malformed source", () => {
    const before = root(),
      after = root();
    put(before, "src/Example.tsx", source("text-foreground"));
    put(after, "src/Example.tsx", "export const X = <div>");
    expect(() => summarizeRepositories(before, before)).toThrow(
      "distinct checkouts"
    );
    expect(() => summarizeRepositories(before, after)).toThrow("syntax error");
    expect(() =>
      summarizeRepositories(before, join(after, "does-not-exist"))
    ).toThrow();
  });
});
