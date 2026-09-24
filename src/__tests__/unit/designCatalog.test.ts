// @vitest-environment node
// Compiler/source and drift contracts only. No application module is evaluated.
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, symlinkSync, existsSync, renameSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, win32 } from "node:path";
import { buildCatalog, renderMarkdown, runCatalog, isRepositoryRelativePath, normalizeCatalogText, INPUT, JSON_OUTPUT, MARKDOWN_OUTPUT, type CatalogSnapshot } from "../../../scripts/design-catalog/generate.mjs";

const roots: string[] = [];
const put = (root: string, path: string, content: string) => {
  const target = join(root, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, content, "utf8");
};
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "edeviser-catalog-")); roots.push(root);
  put(root, "tsconfig.json", JSON.stringify({ compilerOptions: {
    strict: true, jsx: "preserve", target: "ES2022", module: "ESNext", moduleResolution: "Bundler",
    skipLibCheck: true, types: [], lib: ["ES2022"], paths: { "@/*": ["./src/*"] },
  }, include: ["src/**/*.ts", "src/**/*.tsx", "docs/**/*.tsx"] }));
  put(root, "src/global.d.ts", "declare namespace JSX { interface Element {} interface IntrinsicElements {} }");
  put(root, "src/design-system/Widget.tsx", "/** A source-documented widget. @deprecated Fixture only. */\nexport interface WidgetProps {\n  /** Required title. */\n  title: string;\n  count?: number;\n}\n/** Widget docs.\n * @deprecated Fixture API only.\n */\nexport const Widget = (_props: WidgetProps) => null;\n");
  put(root, "src/design-system/patterns/index.ts", 'export { Widget } from "../Widget";\n');
  put(root, "docs/design-system/catalog/examples/recommended.tsx", 'import { Widget as Renamed } from "@/design-system/patterns";\nexport const Demo = () => <Renamed title="Fixture" />;\n');
  put(root, "docs/evidence.md", "Fixture evidence source; not an executed verification claim.");
  const metadata = {
    schemaVersion: 1, scope: "pilot", entries: [{
      id: "widget", exportName: "Widget", canonicalImport: "@/design-system/patterns", purpose: "Fixture purpose",
      status: "recommended-scoped", constraints: ["Fixture only"], requiredStates: ["source contract"], replacement: null,
      example: { path: "docs/design-system/catalog/examples/recommended.tsx", exportName: "Demo" },
      evidence: [{ kind: "review-document", path: "docs/evidence.md", scope: "Source existence" }],
    }],
  };
  put(root, INPUT, JSON.stringify(metadata));
  return { root, metadata };
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe("pilot catalog schema and source extraction", () => {
  it("resolves alias/barrel identity, source JSDoc, optionality and project property types", () => {
    const { root } = fixture(); const catalog = buildCatalog(root); const entry = catalog.entries[0];
    expect(entry?.implementation.path).toBe("src/design-system/Widget.tsx");
    expect(entry?.documentation).toBe("Widget docs.");
    expect(entry?.jsDocTags).toContainEqual({ name: "deprecated", text: "Fixture API only." });
    expect(entry?.api[0]?.properties).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "title", optional: false, type: "string", documentation: "Required title." }),
      expect.objectContaining({ name: "count", optional: true, type: "number | undefined" }),
    ]));
    expect(JSON.parse(JSON.stringify(catalog))).toEqual(catalog);
    expect(JSON.stringify(catalog)).not.toContain(root);
  });

  it("produces byte-stable output and detects source/API drift without mutating artifacts", () => {
    const { root } = fixture(); expect(runCatalog("write", root)).toBe(1);
    const before = readFileSync(join(root, JSON_OUTPUT), "utf8");
    expect(runCatalog("check", root)).toBe(1);
    expect(readFileSync(join(root, JSON_OUTPUT), "utf8")).toBe(before);
    put(root, "src/design-system/Widget.tsx", "export interface WidgetProps { title: string; count?: number; newOption?: boolean }\nexport const Widget = (_props: WidgetProps) => null;\n");
    expect(() => runCatalog("check", root)).toThrow(/drift/);
    expect(readFileSync(join(root, JSON_OUTPUT), "utf8")).toBe(before);
  });

  it.each([
    ["duplicate", /Duplicate catalog id/], ["bad status", /Invalid option/],
    ["manual props", /Unrecognized key[\s\S]*props/], ["missing evidence", /Missing catalog file: docs\/missing\.md/],
    ["outside path", /Expected repository-relative POSIX path/], ["replacement", /Invalid replacement target absent/],
    ["segregation", /Example status segregation mismatch/],
  ] as const)("rejects invalid curated metadata: %s", (kind, failure) => {
    const { root, metadata } = fixture(); const entry = metadata.entries[0];
    if (!entry) throw new Error("Missing fixture entry");
    let input: unknown = metadata;
    if (kind === "duplicate") metadata.entries.push(entry);
    if (kind === "bad status") entry.status = "all-approved";
    if (kind === "manual props") input = { ...metadata, entries: [{ ...entry, props: { title: "string" } }] };
    if (kind === "missing evidence") entry.evidence[0] = { kind: "review-document", path: "docs/missing.md", scope: "Missing" };
    if (kind === "outside path") entry.example.path = "../../outside.tsx";
    if (kind === "replacement") input = { ...metadata, entries: [{ ...entry, replacement: { kind: "review-candidate", targetIds: ["absent"], note: "Not drop-in" } }] };
    if (kind === "segregation") entry.status = "compatibility-review";
    put(root, INPUT, JSON.stringify(input));
    expect(() => buildCatalog(root)).toThrow(failure);
  });

  it.each([
    ["missing export", /Missing public export Absent/], ["wrong symbol", /Example does not render the catalog export/],
    ["private import", /Noncanonical example import/], ["invalid props", /Property 'title' is missing/],
    ["suppression", /Suppressed example diagnostics/],
  ] as const)("fails source/example validation: %s", (kind, failure) => {
    const { root, metadata } = fixture();
    if (kind === "missing export") { metadata.entries[0]!.exportName = "Absent"; put(root, INPUT, JSON.stringify(metadata)); }
    if (kind === "wrong symbol") put(root, "docs/design-system/catalog/examples/recommended.tsx", "const Other = (_props: {title:string}) => null; export const Demo = () => <Other title=\"Fixture\" />;");
    if (kind === "private import") put(root, "docs/design-system/catalog/examples/recommended.tsx", 'import { Widget } from "@/design-system/Widget"; export const Demo = () => <Widget title="Fixture" />;');
    if (kind === "invalid props") put(root, "docs/design-system/catalog/examples/recommended.tsx", 'import { Widget } from "@/design-system/patterns"; export const Demo = () => <Widget />;');
    if (kind === "suppression") put(root, "docs/design-system/catalog/examples/recommended.tsx", '// @ts-nocheck\nimport { Widget } from "@/design-system/patterns"; export const Demo = () => <Widget />;');
    expect(() => buildCatalog(root)).toThrow(failure);
  });
});

describe("catalog text line-ending portability", () => {
  it("normalizes physical CRLF without decoding escaped literal values", () => {
    const literal = String.raw`"a\r\nb"`;
    expect(normalizeCatalogText(`first\r\nsecond ${literal}`)).toBe(`first\nsecond ${literal}`);
    expect(normalizeCatalogText(literal)).toBe(literal);
  });

  it("keeps a full valid fixture and generated text stable through LF to CRLF to LF, but detects an API change", () => {
    const { root } = fixture();
    for (const path of ["tsconfig.json", INPUT]) {
      put(root, path, `${JSON.stringify(JSON.parse(readFileSync(join(root, path), "utf8")), null, 2)}\n`);
    }
    put(root, "src/design-system/Widget.tsx", [
      "export interface WidgetProps {",
      "  /** First property documentation line.",
      "   * Second property documentation line. */",
      "  title: string;",
      "  count?: number;",
      String.raw`  escaped?: "a\r\nb";`,
      "}",
      "/** First component documentation line.",
      " * Second component documentation line.",
      " * @remarks First tag line.",
      " * Second tag line.",
      " */",
      "export const Widget = (_props: WidgetProps) => null;",
      "",
    ].join("\n"));
    put(root, "src/global.d.ts", `${readFileSync(join(root, "src/global.d.ts"), "utf8")}\n`);
    put(root, "docs/evidence.md", "Reference first line.\nReference second line.\n");
    put(root, "scripts/design-catalog/generate.mjs", "// Hash-input fixture only; never executed.\nexport const fixture = true;\n");
    put(root, "package-lock.json", '{\n  "lockfileVersion": 3\n}\n');
    runCatalog("write", root);
    const baseline = buildCatalog(root);
    const entry = baseline.entries[0];
    expect(entry?.documentation).toContain("Second component documentation line.");
    expect(entry?.jsDocTags[0]?.text).toContain("Second tag line.");
    expect(entry?.api[0]?.properties.find((property) => property.name === "title")?.documentation).toContain("Second property documentation line.");
    expect(entry?.api[0]?.properties.find((property) => property.name === "escaped")?.type).toContain(String.raw`"a\r\nb"`);
    const convertTree = (directory: string, ending: "\n" | "\r\n") => {
      for (const file of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, file.name);
        if (file.isDirectory()) convertTree(path, ending);
        else writeFileSync(path, normalizeCatalogText(readFileSync(path, "utf8")).replace(/\n/g, ending), "utf8");
      }
    };
    for (const ending of ["\r\n", "\n"] as const) {
      convertTree(root, ending);
      for (const path of [INPUT, "tsconfig.json", "src/design-system/Widget.tsx", "docs/design-system/catalog/examples/recommended.tsx", JSON_OUTPUT, MARKDOWN_OUTPUT]) {
        const text = readFileSync(join(root, path), "utf8");
        if (ending === "\r\n") expect(text).toContain("\r\n");
        else expect(text).not.toContain("\r\n");
      }
      const before = readFileSync(join(root, JSON_OUTPUT), "utf8");
      expect(buildCatalog(root)).toEqual(baseline);
      expect(runCatalog("check", root)).toBe(1);
      expect(readFileSync(join(root, JSON_OUTPUT), "utf8")).toBe(before); // check stays read-only
    }
    const widgetPath = "src/design-system/Widget.tsx";
    put(root, widgetPath, readFileSync(join(root, widgetPath), "utf8").replace("count?: number;", "count?: number; extra?: boolean;"));
    expect(() => runCatalog("check", root)).toThrow(/Catalog drift\/missing artifact/);
  }, 30000);
});

describe("catalog containment and reference policy", () => {
  it("rejects cross-drive relative results and emits only contained compiler inputs", () => {
    const crossDrive = win32.relative("C:\\fixture", "F:\\compiler\\lib.decorators.d.ts").replace(/\\/g, "/");
    expect(isRepositoryRelativePath(crossDrive)).toBe(false);
    for (const path of ["/absolute.ts", "../escape.ts", "src/../../escape.ts", "src\\wrong.ts"]) expect(isRepositoryRelativePath(path)).toBe(false);
    expect(isRepositoryRelativePath("src/local.ts")).toBe(true);
    const { root } = fixture(); const catalog = buildCatalog(root);
    expect(catalog.inputs.every((input) => isRepositoryRelativePath(input.path))).toBe(true);
    expect(catalog.inputs.some((input) => input.path.includes("lib.decorators"))).toBe(false);
    expect(JSON.stringify(catalog)).not.toMatch(/[A-Za-z]:[\\/]/);
  });

  it.each([
    ["review-document", ".env.local"], ["review-document", "src/secrets.md"],
    ["test-source", "docs/evidence.md"], ["test-source", "src/lib/code.ts"],
  ])("rejects inappropriate %s reference %s before reading it", (kind, path) => {
    const { root, metadata } = fixture();
    metadata.entries[0]!.evidence = [{ kind, path, scope: "Rejected source" }];
    put(root, INPUT, JSON.stringify(metadata));
    expect(() => buildCatalog(root)).toThrow(new RegExp(`Invalid ${kind} evidence path`));
  });

  it("allows changed review prose without API drift but still requires the reference to exist", () => {
    const { root } = fixture(); runCatalog("write", root);
    const before = readFileSync(join(root, JSON_OUTPUT), "utf8");
    expect(buildCatalog(root).inputs.some((input) => input.path === "docs/evidence.md")).toBe(false);
    put(root, "docs/evidence.md", "Updated review prose; no API content derived here.");
    expect(runCatalog("check", root)).toBe(1);
    expect(readFileSync(join(root, JSON_OUTPUT), "utf8")).toBe(before);
    rmSync(join(root, "docs/evidence.md"));
    expect(() => runCatalog("check", root)).toThrow(/Missing catalog file: docs\/evidence\.md/);
  });

  it("rejects an evidence directory link escaping the real repository root", () => {
    const { root, metadata } = fixture();
    const outside = mkdtempSync(join(tmpdir(), "edeviser-catalog-outside-")); roots.push(outside);
    put(outside, "sentinel.md", "outside unchanged");
    symlinkSync(outside, join(root, "docs/review-link"), process.platform === "win32" ? "junction" : "dir");
    metadata.entries[0]!.evidence[0] = { kind: "review-document", path: "docs/review-link/sentinel.md", scope: "Must not follow" };
    put(root, INPUT, JSON.stringify(metadata));
    expect(() => buildCatalog(root)).toThrow(/Catalog realpath escapes repository/);
    expect(readFileSync(join(outside, "sentinel.md"), "utf8")).toBe("outside unchanged");
  });

  it.each(["write", "check"] as const)("preflights both output targets for %s without touching the first artifact", (mode) => {
    const { root } = fixture(); const outside = mkdtempSync(join(tmpdir(), "edeviser-catalog-target-")); roots.push(outside);
    put(root, JSON_OUTPUT, "first artifact unchanged"); put(outside, "sentinel.md", "outside unchanged");
    // Directory junctions work on Windows without file-symlink privileges. A
    // linked/nonregular second target must be rejected BEFORE the first write.
    symlinkSync(outside, join(root, MARKDOWN_OUTPUT), process.platform === "win32" ? "junction" : "dir");
    expect(() => runCatalog(mode, root)).toThrow(/Unsafe catalog output target/);
    expect(readFileSync(join(root, JSON_OUTPUT), "utf8")).toBe("first artifact unchanged");
    expect(readFileSync(join(outside, "sentinel.md"), "utf8")).toBe("outside unchanged");
  });

  it("rejects linked output parents even when they point inside the repository", () => {
    const { root } = fixture(); const original = join(root, "docs/design-system/catalog");
    const storage = join(root, "catalog-storage"); renameSync(original, storage);
    symlinkSync(storage, original, process.platform === "win32" ? "junction" : "dir");
    expect(() => runCatalog("write", root)).toThrow(/Unsafe catalog output parent/);
    expect(existsSync(join(storage, "catalog.generated.json"))).toBe(false);
  });
});

describe("real seven-entry pilot, without application execution", () => {
  let catalog: CatalogSnapshot;
  beforeAll(() => { catalog = buildCatalog(resolve(".")); }, 30000);
  it("matches committed JSON and human-readable output", () => {
    expect(`${JSON.stringify(catalog, null, 2)}\n`).toBe(normalizeCatalogText(readFileSync(resolve(JSON_OUTPUT), "utf8")));
    expect(renderMarkdown(catalog)).toBe(normalizeCatalogText(readFileSync(resolve(MARKDOWN_OUTPUT), "utf8")));
    expect(catalog.entries).toHaveLength(7);
    expect(catalog.scope).toBe("pilot");
  });
  it("keeps source-derived forwardRef/CVA variants while explicitly bounding native props", () => {
    const button = catalog.entries.find((entry) => entry.id === "button");
    expect(button?.implementation.path).toBe("src/components/ui/button.tsx");
    const api = button?.api[0];
    expect(api?.inheritedNative.omittedCount).toBeGreaterThan(0);
    expect(api?.properties.find((property) => property.name === "variant")?.type).toContain('"destructive"');
    expect(api?.properties.find((property) => property.name === "size")?.type).toContain('"icon"');
    expect(api?.properties.find((property) => property.name === "asChild")?.type).toContain("boolean");
  });
  it("does not promote compatibility exports or evidence references to whole-product approval", () => {
    expect(catalog.entries.filter((entry) => entry.status === "compatibility-review").map((entry) => entry.id)).toEqual(["hawdex-card", "kpi-card"]);
    expect(catalog.entries.find((entry) => entry.id === "button")?.status).toBe("adopted-primitive");
    expect(catalog.limitations.join(" ")).toContain("not executed results");
    expect(catalog.limitations.join(" ")).toContain("not rendered stories");
    expect(catalog.entries.every((entry) => entry.replacement === null || entry.replacement.kind === "review-candidate")).toBe(true);
  });
});
