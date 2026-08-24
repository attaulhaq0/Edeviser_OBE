// Feature: Outcome Context Builder (tasks.md 5.3). Properties:
// canonical hierarchy ordering (ILO > PLO > CLO > SUB_CLO), parent->child
// mapping direction only, derived-alignment labeling for ILO rows, and pure
// reshaping of tool-produced evidence (never computes attainment).
import { describe, expect, it } from "vitest";

import { buildOutcomeContext } from "../../../supabase/functions/_shared/ai/context/outcome-context-builder";

const row = (overrides: Record<string, unknown>) => ({
  id: "x",
  type: "CLO",
  title: "untitled",
  ...overrides,
});

describe("buildOutcomeContext", () => {
  it("returns null when there are no outcomes to format", () => {
    expect(buildOutcomeContext({ outcomes: [] })).toBeNull();
    expect(buildOutcomeContext({})).toBeNull();
  });

  it("orders rows by canonical hierarchy rank regardless of input order", () => {
    const block = buildOutcomeContext({
      outcomes: [
        row({ id: "clo-1", type: "CLO", title: "Solve ODEs" }),
        row({ id: "sub-1", type: "SUB_CLO", title: "Separable forms" }),
        row({ id: "plo-1", type: "PLO", title: "Engineering knowledge" }),
        row({ id: "ilo-1", type: "ILO", title: "Depth of knowledge" }),
      ],
    });
    expect(block).not.toBeNull();
    const lines = block!.lines.join("\n");
    expect(lines.indexOf("ILO ilo-1")).toBeGreaterThan(-1);
    expect(lines.indexOf("PLO plo-1")).toBeGreaterThan(
      lines.indexOf("ILO ilo-1")
    );
    expect(lines.indexOf("CLO clo-1")).toBeGreaterThan(
      lines.indexOf("PLO plo-1")
    );
    expect(lines.indexOf("SUB_CLO sub-1")).toBeGreaterThan(
      lines.indexOf("CLO clo-1")
    );
  });

  it("renders children only from canonical parent-to-child edges", () => {
    const block = buildOutcomeContext({
      outcomes: [
        row({ id: "ilo-1", type: "ILO", title: "ILO" }),
        row({ id: "plo-1", type: "PLO", title: "PLO" }),
      ],
      mappings: [{ source_outcome_id: "ilo-1", target_outcome_id: "plo-1" }],
    });
    // source=ilo-1 (parent) -> target=plo-1 (child): the CHILDREN list renders
    // on the parent line only.
    const iloLine = block!.lines.find((l) => l.includes("ILO ilo-1"))!;
    expect(iloLine).toContain("children=[plo-1]");
    const ploLine = block!.lines.find((l) => l.includes("PLO plo-1"))!;
    expect(ploLine).not.toContain("children=");
  });

  it("attaches the derived-alignment marker and never official language to ILO rows", () => {
    const block = buildOutcomeContext({
      outcomes: [row({ id: "ilo-1", type: "ILO", title: "ILO" })],
    });
    const iloLine = block!.lines.find((l) => l.includes("ILO ilo-1"))!;
    expect(iloLine).toContain("derived alignment");
    expect(iloLine.toLowerCase()).toContain("never official");
  });

  it("renders attainment exactly as supplied by deterministic tools", () => {
    const block = buildOutcomeContext({
      outcomes: [row({ id: "clo-1", type: "CLO", title: "CLO" })],
      attainment: [
        {
          outcome_id: "clo-1",
          attainment_percent: 82.5,
          scope: "student_course",
          sample_count: 12,
        },
      ],
    });
    const cloLine = block!.lines.find((l) => l.includes("CLO clo-1"))!;
    expect(cloLine).toContain("attainment=82.5%");
    expect(cloLine).toContain("scope=student_course");
    expect(cloLine).toContain("samples=12");
  });

  it("frames the block as untrusted formatted evidence", () => {
    const block = buildOutcomeContext({
      outcomes: [row({ id: "clo-1", type: "CLO", title: "CLO" })],
    });
    expect(block!.heading).toContain("OBE");
    expect(block!.lines[block!.lines.length - 1]).toMatch(/[Uu]ntrusted/);
  });
});
