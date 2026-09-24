// Feature: platform-audit-fixes, Property 2: Preservation — Existing Behavior Unchanged
// **Validates: Requirements 3.2, 3.3, 3.7, 3.9, 3.10**
//
// Preserve stable platform behavior. Toast presentation now follows the shared
// redesign contract; its single provider-contained mount remains invariant.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import * as fs from "fs";
import * as path from "path";
import ts from "typescript";
import { queryKeys } from "@/lib/queryKeys";
import { XP_SCHEDULE } from "@/lib/xpSchedule";

// Resolve the src root for fs-based source reading
const srcRoot = path.resolve(__dirname, "../../..");

// ─── 2.1 Existing Query Key Factory Preservation ───────────────────────────
// **Validates: Requirements 3.2**

describe("2.1 Existing query key factory preservation", () => {
  const entityTypes = [
    "users",
    "courses",
    "programs",
    "ilos",
    "plos",
    "clos",
    "assignments",
    "enrollments",
    "submissions",
  ] as const;

  it('queryKeys.*.list(filters) produces [entity, "list", filters] for all entity types', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...entityTypes),
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 10 }),
          fc.oneof(fc.string(), fc.integer(), fc.boolean())
        ),
        (entity, filters) => {
          const keys = queryKeys[entity];
          const result = keys.list(filters);
          expect(result).toEqual([entity, "list", filters]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('queryKeys.*.detail(id) produces [entity, "detail", id] for all entity types', () => {
    fc.assert(
      fc.property(fc.constantFrom(...entityTypes), fc.uuid(), (entity, id) => {
        const keys = queryKeys[entity];
        const result = keys.detail(id);
        expect(result).toEqual([entity, "detail", id]);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── 2.2 Existing Audit Logging Preservation ───────────────────────────────
// **Validates: Requirements 3.3**

describe("2.2 Existing audit logging preservation", () => {
  const hooksWithAuditLogging: Array<{ file: string; label: string }> = [
    { file: "src/hooks/useUsers.ts", label: "useUsers" },
    { file: "src/hooks/usePrograms.ts", label: "usePrograms" },
    { file: "src/hooks/useCourses.ts", label: "useCourses" },
    { file: "src/hooks/usePLOs.ts", label: "usePLOs" },
    { file: "src/hooks/useILOs.ts", label: "useILOs" },
    { file: "src/hooks/useBonusEvents.ts", label: "useBonusEvents" },
    { file: "src/hooks/useBulkImport.ts", label: "useBulkImport" },
  ];

  it.each(hooksWithAuditLogging)(
    "$label already contains logAuditEvent calls",
    ({ file }: { file: string }) => {
      const filePath = path.join(srcRoot, file);
      const source = fs.readFileSync(filePath, "utf-8");

      // These hooks already have audit logging — this must remain true after fixes
      expect(source).toContain("logAuditEvent");
    }
  );
});

// ─── 2.3 Unaffected XP Sources Preservation ────────────────────────────────
// **Validates: Requirements 3.9**

describe("2.3 Unaffected XP sources preservation", () => {
  it("XP_SCHEDULE values for unaffected sources remain correct", () => {
    const unaffectedSpec: Record<string, number> = {
      login: 10,
      journal: 20,
      perfect_day: 50,
      perfect_rubric: 75,
    };

    const unaffectedSources = Object.keys(unaffectedSpec);

    fc.assert(
      fc.property(fc.constantFrom(...unaffectedSources), (source: string) => {
        expect(XP_SCHEDULE[source as keyof typeof XP_SCHEDULE]).toBe(
          unaffectedSpec[source]
        );
      }),
      { numRuns: 100 }
    );
  });
});

// ─── 2.4 UI Continuity Preservation ────────────────────────────────────────
// **Validates: Requirements 3.7, 3.10**

describe("2.4 UI continuity preservation", () => {
  it("App.tsx wraps with AuthProvider, QueryClientProvider, NuqsAdapter, and Toaster", () => {
    const filePath = path.join(srcRoot, "src/App.tsx");
    const source = fs.readFileSync(filePath, "utf-8");

    expect(source).toContain("AuthProvider");
    expect(source).toContain("QueryClientProvider");
    expect(source).toContain("NuqsAdapter");
    expect(source).toContain("Toaster");
  });

  it("mounts one shared notification owner inside the real application providers", () => {
    const filePath = path.join(srcRoot, "src/App.tsx");
    const source = fs.readFileSync(filePath, "utf-8");
    const tree = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const imports = tree.statements.filter(ts.isImportDeclaration);
    const ownedImport = imports.filter((node) => ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === "@/components/shared/AppToaster");
    expect(ownedImport).toHaveLength(1);
    expect(ownedImport[0]?.importClause?.name?.text).toBe("AppToaster");
    expect(imports.some((node) => ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === "@/components/ui/sonner")).toBe(false);

    const mounts: string[][] = [];
    const visit = (node: ts.Node, ancestors: string[]) => {
      const parents = ts.isJsxElement(node) ? [...ancestors, node.openingElement.tagName.getText(tree)] : ancestors;
      if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(tree) === "AppToaster") {
        mounts.push(parents);
        expect(node.attributes.properties).toHaveLength(0);
      }
      ts.forEachChild(node, (child) => visit(child, parents));
    };
    visit(tree, []);
    expect(mounts).toHaveLength(1);
    expect(mounts[0]).toEqual(expect.arrayContaining([
      "NuqsAdapter", "QueryClientProvider", "AuthProvider", "LanguageProvider", "ThemeProvider",
    ]));
  });
});
