// @vitest-environment happy-dom
// =============================================================================
// CoordinatorAccreditationNew — Accreditation Evidence screen (task 3.3 / P3)
// Smoke + real-data wiring: readiness hero + tiles + course evidence cards +
// pack checklist from the readiness RPC (mocked), approval workflow from the
// approvals hook (mocked, empty → default stages), and the preserved (real)
// Generate Course File section.
// =============================================================================

import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: () => Promise.resolve() },
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ institutionId: "inst-1" }),
}));

const readinessState = vi.hoisted(() => ({
  isError: false,
  empty: false,
  refetch: vi.fn(),
}));
beforeEach(() => {
  readinessState.isError = false;
  readinessState.empty = false;
});
vi.mock("@/hooks/useCoordinatorAccreditation", () => ({
  useCoordinatorAccreditationReadiness: () => ({
    data: {
      readinessPercent: 100,
      documented: 4,
      partial: 0,
      blocked: 0,
      notStarted: 0,
      courses: [
        { code: "SCI7", name: "Science 7", status: "documented" },
        { code: "MATH6", name: "Mathematics 6", status: "blocked" },
      ],
      pack: readinessState.empty
        ? []
        : [
            { key: "cloMapping", state: "done" },
            { key: "samples", state: "done" },
            { key: "analysis", state: "done" },
            { key: "cqi", state: "prog" },
          ],
    },
    isPending: false,
    isError: readinessState.isError,
    refetch: readinessState.refetch,
  }),
  useAccreditationApprovals: () => ({ data: [] }),
}));

vi.mock("@/hooks/useCourses", () => ({
  useCourses: () => ({ data: { data: [] }, isLoading: false }),
}));

vi.mock("@/hooks/useSemesters", () => ({
  useSemesters: () => ({ data: [], isLoading: false }),
}));

const mutate = vi.fn();
vi.mock("@/hooks/useCourseFile", () => ({
  useGenerateCourseFile: () => ({ mutate, isPending: false }),
}));

import CoordinatorAccreditationNew from "@/pages/coordinator/course-file/CoordinatorAccreditationNew";

const renderPage = () =>
  render(
    <MemoryRouter>
      <CoordinatorAccreditationNew />
    </MemoryRouter>
  );

describe("CoordinatorAccreditationNew", () => {
  it("renders the readiness hero, pack checklist and approval workflow", () => {
    renderPage();
    expect(screen.getByText("accreditation.readiness")).toBeInTheDocument();
    expect(screen.getByText("accreditation.pack")).toBeInTheDocument();
    expect(screen.getByText("accreditation.workflow")).toBeInTheDocument();
  });

  it("shows the same checklist denominator as the CQI status, not 100% course coverage", () => {
    renderPage();
    expect(screen.getAllByText("75%").length).toBeGreaterThan(0);
    expect(screen.queryByText("100%")).not.toBeInTheDocument();
    expect(
      screen.getByText("accreditation.complete").parentElement
    ).toHaveTextContent("3");
    expect(
      screen.getByText("accreditation.inProgress").parentElement
    ).toHaveTextContent("1");
    expect(
      screen.getByText("accreditation.packCqi").closest("li")
    ).toHaveTextContent("accreditation.packInProgress");
    expect(
      screen.getByText("accreditation.packCompletionDisclaimer")
    ).toBeInTheDocument();
  });

  it("does not show a percentage for an empty checklist", () => {
    readinessState.empty = true;
    renderPage();
    expect(screen.queryByText("75%")).not.toBeInTheDocument();
    expect(
      screen.getAllByText("accreditation.packCompletionUnknown").length
    ).toBeGreaterThan(0);
  });

  it("renders query errors explicitly and suppresses stale completion data", () => {
    readinessState.isError = true;
    renderPage();
    expect(
      within(screen.getByRole("alert")).getByText(
        "accreditation.readinessUnavailable"
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("75%")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "accreditation.readinessRetry" })
    ).toBeInTheDocument();
  });

  it("renders real course evidence status cards from the RPC", () => {
    renderPage();
    expect(screen.getByText("SCI7")).toBeInTheDocument();
    expect(screen.getByText("MATH6")).toBeInTheDocument();
  });

  it("renders derived pack checklist items from the RPC", () => {
    renderPage();
    expect(
      screen.getByText("accreditation.packCloMapping")
    ).toBeInTheDocument();
  });

  it("preserves the real Generate Course File section", () => {
    renderPage();
    expect(screen.getByText("accreditation.generateTitle")).toBeInTheDocument();
  });
});
