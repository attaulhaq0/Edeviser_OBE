// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
        created_at: "2025-01-02",
        updated_at: "2025-01-15",
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
});
