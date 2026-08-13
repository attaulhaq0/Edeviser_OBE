import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

const expectTypeGuard = (
  relativePath: string,
  expectedType: "ILO" | "PLO" | "CLO"
): void => {
  const content = source(relativePath);
  const guard = new RegExp(
    `\\.eq\\(\\s*["']type["']\\s*,\\s*["']${expectedType}["']`,
    "g"
  );
  expect(content.match(guard)?.length ?? 0).toBeGreaterThanOrEqual(3);
};

describe("OBE hierarchy governance contracts", () => {
  it("type-constrains ILO, PLO, and CLO detail and mutation hooks", () => {
    expectTypeGuard("src/hooks/useILOs.ts", "ILO");
    expectTypeGuard("src/hooks/usePLOs.ts", "PLO");
    expectTypeGuard("src/hooks/useCLOs.ts", "CLO");
  });

  it("keeps client mapping writes in canonical parent-to-child direction", () => {
    const plos = source("src/hooks/usePLOs.ts");
    expect(plos).toMatch(/source_outcome_id:\s*m\.source_outcome_id/);
    expect(plos).toMatch(/target_outcome_id:\s*data\.ploId/);

    const clos = source("src/hooks/useCLOs.ts");
    expect(clos).toMatch(/source_outcome_id:\s*m\.source_outcome_id/);
    expect(clos).toMatch(/target_outcome_id:\s*data\.cloId/);
  });

  it("traverses PLO children as directed targets in coordinator consumers", () => {
    for (const relativePath of [
      "src/hooks/useCoordinatorOutcomeAttainment.ts",
      "supabase/functions/coordinator-ai-insights/index.ts",
    ]) {
      const content = source(relativePath);
      expect(content).toContain("childrenByParent");
      expect(content).not.toContain("relatedOf");
      expect(content).not.toContain("addEdge(m.target_outcome_id");
    }
  });

  it("finds parent outcomes by child target and aggregates children by parent source", () => {
    const rollup = source(
      "supabase/functions/calculate-attainment-rollup/index.ts"
    );
    expect(rollup).toMatch(
      /select\("source_outcome_id, weight"\)[\s\S]*?eq\("target_outcome_id", cloId\)/
    );
    expect(rollup).toMatch(
      /select\("target_outcome_id, weight"\)[\s\S]*?eq\("source_outcome_id", ploId\)/
    );
    expect(rollup).toMatch(
      /select\("source_outcome_id"\)[\s\S]*?eq\("target_outcome_id", ploId\)/
    );
    expect(rollup).toMatch(
      /select\("target_outcome_id, weight"\)[\s\S]*?eq\("source_outcome_id", iloId\)/
    );
  });

  it("does not query the nonexistent unified Sub-CLO parent column", () => {
    const rollup = source(
      "supabase/functions/calculate-attainment-rollup/index.ts"
    );
    expect(rollup).not.toContain("parent_outcome_id");
    expect(rollup).not.toContain('.eq("type", "SUB_CLO")');
  });

  it("uses current mapping columns and enums in audit fixtures", () => {
    const fixtures = source("supabase/functions/audit-fixtures/index.ts");
    expect(fixtures).not.toContain("child_id: AUDIT_");
    expect(fixtures).not.toContain("parent_id: AUDIT_");
    expect(fixtures).not.toContain('column: "child_id"');
    expect(fixtures).toContain('type: "ILO"');
    expect(fixtures).toContain('type: "PLO"');
    expect(fixtures).toContain('type: "CLO"');
    expect(fixtures).toContain('blooms_level: "remembering"');
    expect(fixtures).toContain('blooms_level: "applying"');
  });

  it("ships a replay-safe canonical hierarchy migration with reconciliation evidence", () => {
    const migration = source(
      "supabase/migrations/20260824000002_canonical_obe_hierarchy_foundation.sql"
    );
    expect(migration).toContain(
      "private.outcome_mapping_reconciliation_backup"
    );
    expect(migration).toContain("validate_outcome_mapping_hierarchy");
    expect(migration).toContain("guard_mapped_outcome_delete");
    expect(migration).toMatch(
      /source_outcome\.type = 'ILO'[\s\S]*target_outcome\.type = 'PLO'/
    );
    expect(migration).toMatch(
      /source_outcome\.type = 'PLO'[\s\S]*target_outcome\.type = 'CLO'/
    );
    expect(migration).toMatch(/ON DELETE RESTRICT/);
    expect(migration).toMatch(
      /GRANT SELECT, INSERT, UPDATE, DELETE[\s\S]*TO authenticated/
    );
    const ploBackfill = migration.match(
      /UPDATE public\.learning_outcomes AS outcome[\s\S]*?SET[\s\S]*?institution_id = program\.institution_id,[\s\S]*?course_id = NULL[\s\S]*?WHERE outcome\.type = 'PLO'::public\.outcome_type[\s\S]*?outcome\.program_id = program\.id/
    );
    const cloBackfill = migration.match(
      /UPDATE public\.learning_outcomes AS outcome[\s\S]*?SET[\s\S]*?institution_id = program\.institution_id,[\s\S]*?program_id = course\.program_id[\s\S]*?WHERE outcome\.type = 'CLO'::public\.outcome_type[\s\S]*?outcome\.course_id = course\.id/
    );
    expect(ploBackfill).not.toBeNull();
    expect(cloBackfill).not.toBeNull();

    const validationIndex = migration.indexOf(
      "VALIDATE CONSTRAINT learning_outcomes_canonical_shape_check"
    );
    expect(ploBackfill?.index ?? -1).toBeGreaterThanOrEqual(0);
    expect(cloBackfill?.index ?? -1).toBeGreaterThanOrEqual(0);
    expect(ploBackfill?.index ?? validationIndex).toBeLessThan(validationIndex);
    expect(cloBackfill?.index ?? validationIndex).toBeLessThan(validationIndex);
  });

  it("uses operation-specific hierarchy policies with explicit write checks", () => {
    const migration = source(
      "supabase/migrations/20260824000002_canonical_obe_hierarchy_foundation.sql"
    );
    for (const policy of [
      "outcomes_admin_ilo_insert",
      "outcomes_coordinator_plo_insert",
      "outcomes_teacher_clo_insert",
      "outcome_mappings_coordinator_insert",
      "outcome_mappings_teacher_insert",
      "sub_clos_teacher_insert",
    ]) {
      expect(migration).toContain(`CREATE POLICY ${policy}`);
    }
    expect(migration.match(/WITH CHECK \(/g)?.length ?? 0).toBeGreaterThan(5);
    expect(migration).not.toContain("CREATE POLICY learning_outcomes_manage");
    expect(migration).not.toContain("CREATE POLICY outcome_mappings_manage");
  });
});
