import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const seedPath = resolve(process.cwd(), "supabase", "seed.sql");
const seedSql = readFileSync(seedPath, "utf8");

describe("local SQL seed safety contract", () => {
  it("uses a stable tenant identity and a sentinel second-run guard", () => {
    expect(seedSql).toContain(
      "v_inst_id := '00000000-0000-4000-8000-000000000002'"
    );
    expect(seedSql).toContain("'seed-demo-university'");
    expect(seedSql).toMatch(
      /SELECT EXISTS\([\s\S]*name = 'Seed Demo University'[\s\S]*IF _seed_exists THEN/
    );
  });

  it("creates deterministic, explicitly seed-owned passwordless identities", () => {
    expect(seedSql).toContain("md5('edeviser-seed-admin')::uuid");
    expect(seedSql).toContain("md5('edeviser-seed-student-' || i)::uuid");
    expect(seedSql).toContain("'seed_owned', true");
    expect(seedSql).not.toContain("encrypted_password");
  });

  it("uses the normal Auth trigger and restores invitation-only onboarding", () => {
    expect(seedSql).not.toMatch(/DISABLE TRIGGER/i);
    expect(seedSql).toContain("'institution_id', v_inst_id");
    expect(seedSql).toContain(
      "UPDATE institutions SET join_mode = 'invite_only' WHERE id = v_inst_id"
    );
  });

  it("uses the current grade-trigger ownership and CLO weight shape", () => {
    expect(seedSql).toMatch(
      /jsonb_build_array\(\s*jsonb_build_object\(\s*'clo_id',[\s\S]*?'weight', 1/
    );
    expect(seedSql).toContain(
      "Evidence and CLO/PLO/ILO attainment are owned by the grade trigger."
    );
    expect(seedSql).not.toMatch(/INSERT INTO evidence/i);
  });

  it("uses current constrained enum-like values", () => {
    expect(seedSql).not.toContain("first_attempt_bonus");
    expect(seedSql).not.toContain("streak_milestone");
    expect(seedSql).toContain("WHEN i <= 10 THEN 'starter'");
    expect(seedSql).toContain("WHEN i <= 25 THEN 'advanced'");
    expect(seedSql).toContain("ELSE 'intermediate'");
  });
});
