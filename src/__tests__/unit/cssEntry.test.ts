// @vitest-environment node
// Architecture checks only. The standalone shell browser regression also builds
// this CSS graph and verifies semantic utilities and computed light/dark styles.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { compile } from "@tailwindcss/node";

const entry = readFileSync(new URL("../../main.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../../index.css", import.meta.url), "utf8");

describe("canonical Tailwind CSS entry", () => {
  it("excludes only the new development benchmark source without banning its utilities", async () => {
    const result = await compile(css, { base: resolve("src"), onDependency: () => {} });
    expect(result.sources.filter((source) => source.negated)).toEqual([
      expect.objectContaining({ pattern: "./__tests__/fixtures/design-agent-benchmark", negated: true }),
    ]);
    // Assemble the candidate so this test does not itself seed production CSS.
    // Explicit test/explorer compilation can still request the utility; this is
    // a file-source exclusion, not a global suppression of a valid style.
    const candidate = ["basis", 40].join("-");
    expect(result.build([candidate])).toContain(`.${candidate}`);
    expect(result.root).not.toBe("none");
  });
  it("loads the utility stylesheet from the application entry", () => {
    expect(entry).toMatch(/import\s+["']@\/index\.css["']/);
  });
  it("compiles semantic theme names in the same graph as Tailwind utilities", () => {
    expect(css).toMatch(/@import\s+["']tailwindcss["']/);
    expect(css).toMatch(/@import\s+["'](?:\.\/|@\/)design-system\/tokens\.css["']/);
  });
  it("does not compile canonical tokens as a disconnected JavaScript CSS import", () => {
    expect(entry).not.toMatch(/import\s+["']@\/design-system\/tokens\.css["']/);
  });
});
