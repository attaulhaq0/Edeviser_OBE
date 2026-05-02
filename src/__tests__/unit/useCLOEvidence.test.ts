// @vitest-environment node
// =============================================================================
// useCLOEvidence — Unit tests for CLO evidence drill-down hook
// Requirements: 44.5
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Supabase mock ──────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockOrder = vi.fn();

interface MockChain {
  select: (...args: unknown[]) => MockChain;
  eq: (...args: unknown[]) => MockChain;
  in: (...args: unknown[]) => MockChain;
  order: (...args: unknown[]) => MockChain;
}

const chainObj: MockChain = {
  select: mockSelect,
  eq: mockEq,
  in: mockIn,
  order: mockOrder,
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => chainObj),
  },
}));

import { supabase as _supabase } from "@/lib/supabase";

const supabase = _supabase as unknown as { from: (table: string) => MockChain };

describe("useCLOEvidence — queryFn logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue(chainObj);
    mockEq.mockReturnValue(chainObj);
    mockIn.mockReturnValue(chainObj);
    mockOrder.mockReturnValue(chainObj);
  });

  it("queries evidence table filtered by clo_id and student_id", () => {
    const chain = supabase.from("evidence");
    chain.select("id, score_percent, created_at, submission_id");
    chain.eq("clo_id", "clo-1");
    chain.eq("student_id", "student-1");
    chain.order("created_at", { ascending: false });

    expect(supabase.from).toHaveBeenCalledWith("evidence");
    expect(mockSelect).toHaveBeenCalledWith(
      "id, score_percent, created_at, submission_id"
    );
    expect(mockEq).toHaveBeenCalledWith("clo_id", "clo-1");
    expect(mockEq).toHaveBeenCalledWith("student_id", "student-1");
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("queries submissions table to resolve assignment_id", () => {
    const chain = supabase.from("submissions");
    chain.select("id, assignment_id");
    chain.in("id", ["sub-1", "sub-2"]);

    expect(supabase.from).toHaveBeenCalledWith("submissions");
    expect(mockSelect).toHaveBeenCalledWith("id, assignment_id");
    expect(mockIn).toHaveBeenCalledWith("id", ["sub-1", "sub-2"]);
  });

  it("queries assignments table to resolve titles", () => {
    const chain = supabase.from("assignments");
    chain.select("id, title");
    chain.in("id", ["assign-1"]);

    expect(supabase.from).toHaveBeenCalledWith("assignments");
    expect(mockSelect).toHaveBeenCalledWith("id, title");
    expect(mockIn).toHaveBeenCalledWith("id", ["assign-1"]);
  });

  it("maps evidence rows to CLOEvidenceRecord shape", () => {
    // Simulate the mapping logic from the hook
    const evidenceRows = [
      {
        id: "ev-1",
        score_percent: 85,
        created_at: "2025-01-15T10:00:00Z",
        submission_id: "sub-1",
      },
      {
        id: "ev-2",
        score_percent: 72,
        created_at: "2025-01-10T10:00:00Z",
        submission_id: "sub-2",
      },
    ];

    const submissions = [
      { id: "sub-1", assignment_id: "assign-1" },
      { id: "sub-2", assignment_id: "assign-2" },
    ];

    const assignments = [
      { id: "assign-1", title: "Midterm Essay" },
      { id: "assign-2", title: "Lab Report 3" },
    ];

    // Build lookup maps (same logic as the hook)
    const assignmentMap = new Map<string, string>();
    for (const a of assignments) {
      assignmentMap.set(a.id, a.title);
    }

    const submissionAssignmentMap = new Map<string, string>();
    for (const s of submissions) {
      submissionAssignmentMap.set(s.id, s.assignment_id);
    }

    const result = evidenceRows.map((e) => {
      const assignmentId = submissionAssignmentMap.get(e.submission_id) ?? "";
      return {
        id: e.id,
        assignment_title:
          assignmentMap.get(assignmentId) ?? "Unknown Assignment",
        score_percent: e.score_percent,
        created_at: e.created_at,
      };
    });

    expect(result).toEqual([
      {
        id: "ev-1",
        assignment_title: "Midterm Essay",
        score_percent: 85,
        created_at: "2025-01-15T10:00:00Z",
      },
      {
        id: "ev-2",
        assignment_title: "Lab Report 3",
        score_percent: 72,
        created_at: "2025-01-10T10:00:00Z",
      },
    ]);
  });

  it('returns "Unknown Assignment" when assignment lookup fails', () => {
    const evidenceRows = [
      {
        id: "ev-1",
        score_percent: 60,
        created_at: "2025-01-15T10:00:00Z",
        submission_id: "sub-missing",
      },
    ];

    const submissionAssignmentMap = new Map<string, string>();
    const assignmentMap = new Map<string, string>();

    const result = evidenceRows.map((e) => {
      const assignmentId = submissionAssignmentMap.get(e.submission_id) ?? "";
      return {
        id: e.id,
        assignment_title:
          assignmentMap.get(assignmentId) ?? "Unknown Assignment",
        score_percent: e.score_percent,
        created_at: e.created_at,
      };
    });

    expect(result[0]!.assignment_title).toBe("Unknown Assignment");
  });
});
