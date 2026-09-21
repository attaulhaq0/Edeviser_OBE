// Feature: course-file repair, governed deployment and transitive authentication dependencies.
import { describe, expect, it } from "vitest";
import ts from "typescript";
import {
  readManifest,
  resolveDeploymentImpact,
  validateManifest,
} from "../../../scripts/resolve-runtime-deployment-impact.mjs";
import {
  declaredLocalSourceClosure,
  relativeImportSpecifiers,
} from "../../../scripts/runtime-source-parity.mjs";

const manifest = readManifest();
const group = manifest.runtimeGroups.find(
  (entry) => entry.name === "course-reporting"
);
if (!group)
  throw new Error("Course reporting must have an explicit deployment owner");
const closure = group.functions.map((entry) => entry.slug).sort();

describe("course-file deployment governance", () => {
  it.each([
    'import { client } from "https://example.test/sdk";',
    "import { client } from 'https://example.test/sdk';",
    'const note = "https://example.test/not/*a-comment*/";',
    "const note = `https://example.test/not/*a-comment*/`;",
  ])(
    "does not let quoted URL text hide the next local import: %s",
    (prefix) => {
      expect(
        relativeImportSpecifiers(
          `${prefix}\nimport { key } from "./serverSecret.ts";`
        )
      ).toEqual(["./serverSecret.ts"]);
    }
  );

  it("ignores commented imports while retaining export and dynamic dependencies", () => {
    expect(
      relativeImportSpecifiers(
        '// import fake from "./absent.ts";\n/* export * from "./absent2.ts"; */\nexport { real } from "./real.ts";\nconst load = import("./lazy.ts");'
      )
    ).toEqual(["./real.ts", "./lazy.ts"]);
  });
  it.each([
    'const value = `${ 1 /* comment: import("./phantom.ts") */ }`;\nimport real from "./real.ts";',
    'const value = `${ 1 // import("./phantom.ts")\n}`;\nimport real from "./real.ts";',
    'const value = `${ `${ 1 /* import("./phantom.ts") */ }` }`;\nimport real from "./real.ts";',
    'const value = `${ ({ brace: "}", nested: { value: 1 } }) /* import("./phantom.ts") */ }`;\nimport real from "./real.ts";',
    'const value = `${ "https://example.test/path" /* import("./phantom.ts") */ }`;\nimport real from "./real.ts";',
  ])(
    "ignores comment imports inside template expression code: %s",
    (source) => {
      expect(relativeImportSpecifiers(source)).toEqual(["./real.ts"]);
    }
  );

  it("retains a real dynamic import in nested template expression code", () => {
    const source =
      'const value = `${ `${ await import("./lazy.ts") /* import("./phantom.ts") */ }` }`;\nimport real from "./real.ts";';
    expect(relativeImportSpecifiers(source)).toEqual([
      "./lazy.ts",
      "./real.ts",
    ]);
  });

  it.each(["index.ts", "contracts.ts", "handler.ts", "pdf.ts"])(
    "governs the changed %s source through the declared closure",
    (file) => {
      const impact = resolveDeploymentImpact(
        [`supabase/functions/generate-course-file/${file}`],
        manifest
      );
      expect(impact.errors).toEqual([]);
      expect(impact.affectedGroups).toEqual([group.name]);
      expect(impact.functions).toEqual(closure);
      expect(impact.deploymentRequired).toBe(true);
    }
  );

  it("requires authenticated deployment and passes actual manifest validation", () => {
    expect(
      group.functions.find((entry) => entry.slug === "generate-course-file")
        ?.verifyJwt
    ).toBe(true);
    expect(validateManifest(manifest).failures).toEqual([]);
  });

  it.each(["auth.ts", "serverSecret.ts"])(
    "selects course reporting when transitive %s changes",
    (file) => {
      const impact = resolveDeploymentImpact(
        [`supabase/functions/_shared/${file}`],
        manifest
      );
      expect(impact.errors).toEqual([]);
      expect(impact.affectedGroups).toContain(group.name);
      for (const slug of closure) expect(impact.functions).toContain(slug);
    }
  );

  it("includes the actual imported authentication source in parity attestation", () => {
    const sources = declaredLocalSourceClosure(
      "generate-course-file",
      group.runtimeDependencyPaths
    );
    expect([...sources.keys()]).toContain("functions/_shared/auth.ts");
    expect([...sources.keys()]).toContain("functions/_shared/serverSecret.ts");
  });

  it("agrees with the TypeScript AST for every discovered managed runtime source", () => {
    const sources = new Map<string, string>();
    for (const runtimeGroup of manifest.runtimeGroups) {
      for (const fn of runtimeGroup.functions) {
        for (const [file, source] of declaredLocalSourceClosure(
          fn.slug,
          runtimeGroup.runtimeDependencyPaths
        )) {
          if (/\.[cm]?[jt]sx?$/.test(file)) sources.set(file, source);
        }
      }
    }
    expect(sources.size).toBeGreaterThan(0);
    const problems: {
      file: string;
      kind: string;
      expected?: string[];
      observed?: string[];
    }[] = [];
    for (const [file, source] of sources) {
      const ast = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true
      );
      const expected: string[] = [];
      const take = (node: ts.Node | undefined) => {
        if (
          node &&
          (ts.isStringLiteral(node) ||
            ts.isNoSubstitutionTemplateLiteral(node)) &&
          node.text.startsWith(".")
        )
          expected.push(node.text);
      };
      const visit = (node: ts.Node) => {
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
          take(node.moduleSpecifier);
        if (
          ts.isCallExpression(node) &&
          node.expression.kind === ts.SyntaxKind.ImportKeyword
        ) {
          const argument = node.arguments[0];
          if (
            argument &&
            (ts.isStringLiteral(argument) ||
              ts.isNoSubstitutionTemplateLiteral(argument))
          )
            take(argument);
          else
            problems.push({
              file,
              kind: "unsupported nonliteral dynamic import",
            });
        }
        if (ts.isImportEqualsDeclaration(node))
          problems.push({ file, kind: "unsupported import-equals" });
        ts.forEachChild(node, visit);
      };
      visit(ast);
      const wanted = [...new Set(expected)].sort();
      const observed = [...new Set(relativeImportSpecifiers(source))].sort();
      if (JSON.stringify(wanted) !== JSON.stringify(observed))
        problems.push({
          file,
          kind: "literal dependency mismatch",
          expected: wanted,
          observed,
        });
    }
    // A missed child import is caught in its already-discovered parent's AST.
    // Future unsupported syntax must fail this gate, not silently escape parity.
    expect(problems).toEqual([]);
  });

  it("still fails closed if course reporting is removed instead of governed", () => {
    const invalid = {
      ...manifest,
      runtimeGroups: manifest.runtimeGroups.filter(
        (entry) => entry.name !== group.name
      ),
    };
    expect(
      resolveDeploymentImpact(
        ["supabase/functions/generate-course-file/index.ts"],
        invalid
      ).errors
    ).toContain(
      "unmanaged Edge Function changed: supabase/functions/generate-course-file/index.ts"
    );
  });
});
