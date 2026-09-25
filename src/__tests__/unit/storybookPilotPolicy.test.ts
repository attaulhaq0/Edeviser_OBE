// @vitest-environment node
// Source/CI contracts only; the isolated built-browser matrix is separate.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../..");
const text = (path: string) => readFileSync(resolve(root, path), "utf8");
const packageJson = JSON.parse(text("package.json"));
const lock = JSON.parse(text("package-lock.json"));
const workflow = text(".github/workflows/ci.yml");
const preview = text(".storybook/preview.tsx");
const main = text(".storybook/main.ts");
const stateStories = text("src/design-system/stories/StatePanel.stories.tsx");
const readingStories = text(
  "src/design-system/stories/Compositions.stories.tsx"
);
const exportsIn = (source: string) => {
  const file = ts.createSourceFile(
    "story.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  return file.statements
    .filter(ts.isVariableStatement)
    .filter((item) =>
      item.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
      )
    )
    .flatMap((item) =>
      item.declarationList.declarations.map((declaration) =>
        declaration.name.getText(file)
      )
    );
};

const importsIn = (source: string) => {
  const file = ts.createSourceFile(
    "pilot.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  return file.statements
    .filter(ts.isImportDeclaration)
    .map((node) => node.moduleSpecifier.getText(file));
};
describe("PR06 real-source explorer pilot ownership", () => {
  it("pins reviewed dev-only framework and addon versions with lock integrity", () => {
    for (const name of [
      "storybook",
      "@storybook/react-vite",
      "@storybook/addon-a11y",
    ]) {
      expect(packageJson.devDependencies[name]).toBe("10.6.0");
      expect(packageJson.dependencies[name]).toBeUndefined();
      expect(lock.packages[`node_modules/${name}`]).toMatchObject({
        version: "10.6.0",
        dev: true,
        license: "MIT",
      });
      expect(lock.packages[`node_modules/${name}`].integrity).toMatch(
        /^sha512-/
      );
    }
    expect(packageJson.scripts["check:storybook:pilot"]).toContain(
      "tsconfig.storybook.json"
    );
    expect(packageJson.scripts["build:storybook:pilot"]).toContain(
      "test-results/storybook-pilot"
    );
  });

  it("discovers only eight real-source patterns without importing an app or auth owner", () => {
    expect(main).toContain("../src/design-system/stories/**/*.stories.tsx");
    expect(main).toContain('envPrefix: "STORYBOOK_"');
    expect(main).toContain('new URL("./safe-env/", import.meta.url)');
    expect(importsIn(main).join(" ")).not.toMatch(
      /App\.tsx|AuthProvider|\.env\.local/
    );
    expect(exportsIn(stateStories)).toEqual([
      "Loading",
      "Empty",
      "Error",
      "Partial",
      "Permission",
      "LocalAction",
    ]);
    expect(exportsIn(readingStories)).toEqual(["Default", "ExtendedCopy"]);
    for (const source of [stateStories, readingStories]) {
      expect(source).toContain('"@/design-system/patterns"');
      expect(importsIn(source).join(" ")).not.toMatch(
        /useAuth|supabase|useQuery|mockServiceWorker|@\/router/
      );
    }
  });

  it("uses actual CSS/i18n and simulated globals, not forged identity preference providers", () => {
    expect(preview).toContain('import "../src/index.css"');
    expect(preview).toContain('from "../src/lib/i18n"');
    expect(preview).toContain("applyDirection(locale)");
    expect(preview).toContain(
      'root.classList.toggle("high-contrast", highContrast)'
    );
    expect(preview).toContain('locale: "en"');
    expect(preview).toContain('items: ["normal", "large", "double"]');
    expect(preview).toContain('"32px"');
    expect(importsIn(preview).join(" ")).not.toMatch(
      /AuthProvider|ThemeProvider|LanguageProvider|AccessibilityPreferencesProvider/
    );
  });

  it("ignores only generated Storybook bytes, not authored stories", () => {
    const lint = text("eslint.config.js");
    expect(lint).toContain('"test-results/storybook-pilot/**"');
    expect(lint).not.toMatch(
      /ignores:\s*\[[\s\S]*?src\/design-system\/stories/
    );
    expect(lint).toContain('files: [".storybook/preview.tsx"]');
  });
  it("runs Storybook only in a fake-key job and makes it a build prerequisite", () => {
    const start = workflow.indexOf("  storybook-pilot:");
    const end = workflow.indexOf("  build:", start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const job = workflow.slice(start, end);
    expect(job).toContain("VITE_SUPABASE_URL: http://127.0.0.1:54321");
    expect(job).toContain("VITE_SUPABASE_ANON_KEY: fake-storybook-pilot-key");
    expect(job).toContain("npm ci --ignore-scripts");
    expect(job.indexOf("npm run build:storybook:pilot")).toBeLessThan(
      job.indexOf("npm run test:storybook:pilot")
    );
    expect(job).not.toContain("secrets.");
    expect(job).not.toContain("upload-artifact");
    expect(workflow).toContain("run: npm run check:storybook:pilot");
    expect(workflow).toContain(
      "needs: [lint, typecheck, test, auth-expiry-local, storybook-pilot]"
    );
  });
});
