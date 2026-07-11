// @vitest-environment happy-dom
// =============================================================================
// CoordinatorAccreditationNew — Accreditation Evidence screen (task 3.3 / P3)
// Smoke + real-data wiring: readiness hero + tiles + course evidence cards +
// pack checklist from the readiness RPC (mocked), approval workflow from the
// approvals hook (mocked, empty → default stages), and the preserved (real)
// Generate Course File section.
// =============================================================================

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

vi.mock("@/hooks/useCoordinatorAccreditation", () => ({
  useCoordinatorAccreditationReadiness: () => ({
    data: {
      readinessPercent: 86,
      documented: 3,
      partial: 1,
      blocked: 1,
      notStarted: 0,
      courses: [
        { code: "SCI7", name: "Science 7", status: "documented" },
        { code: "MATH6", name: "Mathematics 6", status: "blocked" },
      ],
      pack: [
        { key: "cloMapping", state: "done" },
        { key: "cqi", state: "prog" },
      ],
    },
    isPending: false,
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

  it("wires the real readiness percent from the RPC", () => {
    renderPage();
    // 86% renders in both the MasteryRing label and the hero text.
    expect(screen.getAllByText("86%").length).toBeGreaterThan(0);
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
