// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// Mock hooks
vi.mock("@/hooks/useCQIPlans", () => ({
  useCQIPlans: vi.fn(() => ({
    data: [
      {
        id: "cqi-1",
        program_id: "prog-1",
        semester_id: "sem-1",
        outcome_id: "plo-1",
        outcome_type: "PLO",
        baseline_attainment: 45,
        target_attainment: 70,
        action_description: "Add more lab sessions for practical skills",
        responsible_person: "Dr. Smith",
        status: "planned",
        result_attainment: null,
        // Req 9.4: a plan WITHOUT the new fields (null) must not crash / show empty labels
        root_cause: null,
        due_date: null,
        evidence_of_improvement: null,
        created_at: "2025-01-01",
        updated_at: "2025-01-01",
      },
      {
        id: "cqi-2",
        program_id: "prog-1",
        semester_id: "sem-1",
        outcome_id: "plo-2",
        outcome_type: "PLO",
        baseline_attainment: 60,
        target_attainment: 80,
        action_description: "Revise assessment rubrics",
        responsible_person: "Dr. Jones",
        status: "evaluated",
        result_attainment: 82,
        root_cause: null,
        due_date: null,
        evidence_of_improvement: null,
        created_at: "2025-01-02",
        updated_at: "2025-01-15",
      },
      {
        // Req 9.4: a plan WITH the new CQI fields populated → values must be displayed
        id: "cqi-3",
        program_id: "prog-1",
        semester_id: "sem-1",
        outcome_id: "plo-3",
        outcome_type: "PLO",
        baseline_attainment: 55,
        target_attainment: 75,
        action_description: "Introduce weekly formative quizzes",
        responsible_person: "Dr. Lee",
        status: "in_progress",
        result_attainment: null,
        root_cause: "Insufficient hands-on lab time in the curriculum",
        due_date: "2025-06-30",
        evidence_of_improvement:
          "Lab attainment rose to 78% in the re-evaluation",
        created_at: "2025-01-03",
        updated_at: "2025-01-20",
      },
    ],
    isLoading: false,
  })),
  useCreateCQIPlan: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateCQIPlan: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteCQIPlan: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1" }, institutionId: "inst-1" }),
}));

vi.mock("@/hooks/usePrograms", () => ({
  usePrograms: vi.fn(() => ({
    data: { data: [{ id: "prog-1", name: "CS Program", code: "CS" }] },
  })),
}));

vi.mock("@/hooks/useSemesters", () => ({
  useSemesters: vi.fn(() => ({
    data: [{ id: "sem-1", name: "Fall 2025" }],
  })),
}));

vi.mock("@/hooks/usePLOs", () => ({
  usePLOs: vi.fn(() => ({
    data: { data: [{ id: "plo-1", title: "PLO-1: Critical Thinking" }] },
  })),
}));

import CQIManager from "@/pages/coordinator/cqi/CQIManager";

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe("CQIManager", () => {
  it("renders page title", () => {
    render(<CQIManager />, { wrapper: createWrapper() });
    expect(screen.getByText("CQI Action Plans")).toBeInTheDocument();
  });

  it("renders new plan button", () => {
    render(<CQIManager />, { wrapper: createWrapper() });
    expect(screen.getByText("New Plan")).toBeInTheDocument();
  });

  it("renders section header", () => {
    render(<CQIManager />, { wrapper: createWrapper() });
    expect(screen.getByText("Action Plans")).toBeInTheDocument();
  });

  it("renders plan action descriptions", () => {
    render(<CQIManager />, { wrapper: createWrapper() });
    expect(
      screen.getByText("Add more lab sessions for practical skills")
    ).toBeInTheDocument();
    expect(screen.getByText("Revise assessment rubrics")).toBeInTheDocument();
  });

  it("renders plan status badges", () => {
    render(<CQIManager />, { wrapper: createWrapper() });
    expect(screen.getByText("Planned")).toBeInTheDocument();
    expect(screen.getByText("Evaluated")).toBeInTheDocument();
  });

  it("renders baseline and target attainment values", () => {
    render(<CQIManager />, { wrapper: createWrapper() });
    expect(screen.getByText("Baseline: 45%")).toBeInTheDocument();
    expect(screen.getByText("Target: 70%")).toBeInTheDocument();
  });

  it("renders result attainment for evaluated plans", () => {
    render(<CQIManager />, { wrapper: createWrapper() });
    expect(screen.getByText("Result: 82%")).toBeInTheDocument();
  });

  it("renders responsible person", () => {
    render(<CQIManager />, { wrapper: createWrapper() });
    expect(screen.getByText("Responsible: Dr. Smith")).toBeInTheDocument();
    expect(screen.getByText("Responsible: Dr. Jones")).toBeInTheDocument();
  });

  it("renders status advance button for planned status", () => {
    render(<CQIManager />, { wrapper: createWrapper() });
    expect(screen.getByText("Start Implementation")).toBeInTheDocument();
  });

  // ─── CQI new fields: Root Cause, Deadline, Evidence of Improvement (Req 9.2–9.4) ──

  it("displays root cause, deadline, and evidence of improvement when populated", () => {
    // Validates Requirement 9.4 — a plan with the new fields populated renders them
    render(<CQIManager />, { wrapper: createWrapper() });

    // Field labels are present
    expect(screen.getByText("Root Cause:")).toBeInTheDocument();
    expect(screen.getByText("Evidence of Improvement:")).toBeInTheDocument();

    // Field values are displayed
    expect(
      screen.getByText("Insufficient hands-on lab time in the curriculum")
    ).toBeInTheDocument();
    expect(screen.getByText("Deadline: 2025-06-30")).toBeInTheDocument();
    expect(
      screen.getByText("Lab attainment rose to 78% in the re-evaluation")
    ).toBeInTheDocument();
  });

  it("does not render empty CQI field labels for plans missing those values", () => {
    // Validates Requirement 9.4 — plans with null new fields must not crash or
    // render empty labels. Only the single populated plan (cqi-3) contributes labels.
    render(<CQIManager />, { wrapper: createWrapper() });

    expect(screen.getAllByText("Root Cause:")).toHaveLength(1);
    expect(screen.getAllByText("Evidence of Improvement:")).toHaveLength(1);
    // The deadline line only renders for the plan that has a due_date
    expect(screen.getAllByText(/^Deadline:/)).toHaveLength(1);
  });

  it("exposes Root Cause, Deadline, and Evidence of Improvement fields in the New Plan dialog", async () => {
    // Validates Requirements 9.2 & 9.3 — the create/edit form provides inputs for
    // the three new fields so coordinators can record and persist them.
    const user = userEvent.setup();
    render(<CQIManager />, { wrapper: createWrapper() });

    await user.click(screen.getByRole("button", { name: /new plan/i }));

    expect(
      screen.getByRole("heading", { name: /new cqi action plan/i })
    ).toBeInTheDocument();

    // Form labels for the three new fields (no trailing colon — distinct from display)
    expect(screen.getByText("Root Cause")).toBeInTheDocument();
    expect(screen.getByText("Deadline")).toBeInTheDocument();
    expect(screen.getByText("Evidence of Improvement")).toBeInTheDocument();

    // A date input control is present for the deadline field
    expect(document.querySelector('input[type="date"]')).toBeInTheDocument();
  });
});
