// @vitest-environment happy-dom
// =============================================================================
// CurriculumMatrix — coverage-summary column (UI prototype migration, task 3.3)
// Verifies the per-PLO coverage % derived from real cell statuses:
//   assessed (green) = 1.0, introduced (yellow) = 0.5, not-covered/gap = 0.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Mock data driving the matrix ────────────────────────────────────────────

interface MockCell {
  status: "green" | "yellow" | "red" | "gray";
  cloCount: number;
  attainmentPercent: number;
}
interface MockMatrix {
  plos: { id: string; title: string }[];
  courses: { id: string; code: string }[];
  matrix: Record<string, Record<string, MockCell>>;
}

let mockData: MockMatrix;

// Preserve the real CELL_ATTAINMENT_UNMEASURED / types; override only the hook.
vi.mock("@/hooks/useCurriculumMatrix", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/hooks/useCurriculumMatrix")
  >();
  return {
    ...actual,
    useCurriculumMatrix: () => ({ data: mockData, isLoading: false }),
  };
});

import CurriculumMatrix from "@/components/shared/CurriculumMatrix";

describe("CurriculumMatrix — coverage summary column", () => {
  beforeEach(() => {
    // 2 courses: one assessed (green, 90%), one introduced (yellow, 60%).
    // Coverage = (1.0 + 0.5) / 2 = 75%.
    mockData = {
      plos: [{ id: "plo1", title: "Analyze problems" }],
      courses: [
        { id: "c1", code: "CS101" },
        { id: "c2", code: "CS102" },
      ],
      matrix: {
        plo1: {
          c1: { status: "green", cloCount: 1, attainmentPercent: 90 },
          c2: { status: "yellow", cloCount: 1, attainmentPercent: 60 },
        },
      },
    };
  });

  it("does NOT render a coverage column when coverageLabel is omitted", () => {
    render(<CurriculumMatrix programId="p1" />);
    expect(screen.queryByText("Coverage")).not.toBeInTheDocument();
    // No coverage % computed → 75% must be absent (cells show 90%/60% only).
    expect(screen.queryByText("75%")).not.toBeInTheDocument();
  });

  it("renders the coverage column header when coverageLabel is provided", () => {
    render(<CurriculumMatrix programId="p1" coverageLabel="Coverage" />);
    expect(screen.getByText("Coverage")).toBeInTheDocument();
  });

  it("computes coverage as assessed*1 + introduced*0.5 over courses (75%)", () => {
    render(<CurriculumMatrix programId="p1" coverageLabel="Coverage" />);
    expect(screen.getByText("75%")).toBeInTheDocument();
    // Cell labels remain the real attainment percentages.
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("computes 100% when every course assesses the outcome (all green)", () => {
    mockData.matrix.plo1!.c2 = {
      status: "green",
      cloCount: 1,
      attainmentPercent: 88,
    };
    render(<CurriculumMatrix programId="p1" coverageLabel="Coverage" />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("computes 0% when no course covers the outcome (gray/red only)", () => {
    mockData.matrix.plo1!.c1 = {
      status: "gray",
      cloCount: 0,
      attainmentPercent: -1,
    };
    mockData.matrix.plo1!.c2 = {
      status: "red",
      cloCount: 1,
      attainmentPercent: 30,
    };
    render(<CurriculumMatrix programId="p1" coverageLabel="Coverage" />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});
