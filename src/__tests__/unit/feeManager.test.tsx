// @vitest-environment happy-dom
// =============================================================================
// FeeManager — Program/Semester dropdowns + disabled-until-selected submit
//
// Feature: qa-partner-review-remediation — Req 12 (P8)
// Validates: Requirements 12.1, 12.2, 12.4
//
// The Admin Fees form previously used free-text `<Input placeholder="UUID">`
// controls for `program_id` and `semester_id`. Req 12 replaces them with Shadcn
// `Select` dropdowns sourced from `usePrograms()` / `useSemesters()`, feeds the
// selected ids to `useCreateFeeStructure`, and disables submission (with a hint)
// until BOTH a program and a semester are selected.
//
// This suite mocks the data/mutation hooks (no Supabase/network) and asserts:
//   12.1 — a Program dropdown renders, populated from `usePrograms`
//   12.2 — a Semester dropdown renders, populated from `useSemesters`
//   12.4 — submit is disabled and a required-selection hint shows until both
//          values are selected; selecting both enables submit
// =============================================================================

import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { Program, Semester } from "@/types/app";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROGRAMS: Program[] = [
  {
    id: "prog-1",
    name: "Computer Science",
    code: "CS",
    description: null,
    institution_id: "inst-1",
    coordinator_id: null,
    department_id: null,
    is_active: true,
    created_at: "2025-01-01",
  },
  {
    id: "prog-2",
    name: "Business Administration",
    code: "BA",
    description: null,
    institution_id: "inst-1",
    coordinator_id: null,
    department_id: null,
    is_active: true,
    created_at: "2025-01-02",
  },
];

const SEMESTERS: Semester[] = [
  {
    id: "sem-1",
    institution_id: "inst-1",
    name: "Fall 2025",
    code: "FA25",
    start_date: "2025-09-01",
    end_date: "2025-12-20",
    is_active: true,
    created_at: "2025-01-01",
  },
  {
    id: "sem-2",
    institution_id: "inst-1",
    name: "Spring 2026",
    code: "SP26",
    start_date: "2026-02-01",
    end_date: "2026-05-30",
    is_active: false,
    created_at: "2025-01-02",
  },
];

// ---------------------------------------------------------------------------
// Mocks (must precede the component import)
// ---------------------------------------------------------------------------

const mockCreateMutate = vi.fn();

vi.mock("@/hooks/useFees", () => ({
  useFeeStructures: vi.fn(() => ({ data: [], isLoading: false })),
  useCreateFeeStructure: vi.fn(() => ({
    mutate: mockCreateMutate,
    isPending: false,
  })),
}));

vi.mock("@/hooks/usePrograms", () => ({
  // FeeManager calls `usePrograms({ pageSize: 100 })` and reads `result?.data`.
  usePrograms: vi.fn(() => ({ data: { data: PROGRAMS } })),
}));

vi.mock("@/hooks/useSemesters", () => ({
  // FeeManager calls `useSemesters()` and reads the array directly.
  useSemesters: vi.fn(() => ({ data: SEMESTERS })),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1" }, institutionId: "inst-1" }),
}));

// happy-dom lacks ResizeObserver + the pointer/scroll APIs Radix Select relies
// on. Stub them so the Select triggers render and can be opened in tests.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", MockResizeObserver);

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

import FeeManager from "@/pages/admin/fees/FeeManager";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

const HINT_TEXT = "Select a program and a semester to create a fee structure.";

const getTriggerByPlaceholder = (placeholder: string): HTMLElement => {
  const node = screen.getByText(placeholder).closest("button");
  expect(node).not.toBeNull();
  return node as HTMLElement;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FeeManager — fee dropdowns + disabled-until-selected (Req 12.1, 12.2, 12.4)", () => {
  it("renders Program and Semester dropdowns instead of free-text UUID inputs", () => {
    // Validates Requirements 12.1 & 12.2 — both selections are dropdowns.
    render(<FeeManager />, { wrapper: createWrapper() });

    // Two Shadcn/Radix Select triggers render as comboboxes (program + semester).
    expect(screen.getAllByRole("combobox")).toHaveLength(2);

    // Their placeholder labels are visible on the triggers.
    expect(screen.getByText("Select a program")).toBeInTheDocument();
    expect(screen.getByText("Select a semester")).toBeInTheDocument();

    // The field labels are present.
    expect(screen.getByText("Program")).toBeInTheDocument();
    expect(screen.getByText("Semester")).toBeInTheDocument();

    // No legacy free-text UUID inputs remain.
    expect(screen.queryByPlaceholderText(/uuid/i)).not.toBeInTheDocument();
  });

  it("populates the Program dropdown options from usePrograms", async () => {
    // Validates Requirement 12.1 — program options come from the hook.
    const user = userEvent.setup();
    render(<FeeManager />, { wrapper: createWrapper() });

    await user.click(getTriggerByPlaceholder("Select a program"));

    const listbox = await screen.findByRole("listbox");
    expect(
      within(listbox).getByRole("option", { name: "Computer Science" })
    ).toBeInTheDocument();
    expect(
      within(listbox).getByRole("option", { name: "Business Administration" })
    ).toBeInTheDocument();
  });

  it("populates the Semester dropdown options from useSemesters", async () => {
    // Validates Requirement 12.2 — semester options come from the hook
    // (rendered as "{name} ({code})").
    const user = userEvent.setup();
    render(<FeeManager />, { wrapper: createWrapper() });

    await user.click(getTriggerByPlaceholder("Select a semester"));

    const listbox = await screen.findByRole("listbox");
    expect(
      within(listbox).getByRole("option", { name: "Fall 2025 (FA25)" })
    ).toBeInTheDocument();
    expect(
      within(listbox).getByRole("option", { name: "Spring 2026 (SP26)" })
    ).toBeInTheDocument();
  });

  it("disables submit and shows the hint until both program and semester are selected", () => {
    // Validates Requirement 12.4 — disabled-by-default with a required-selection hint.
    render(<FeeManager />, { wrapper: createWrapper() });

    const submit = screen.getByRole("button", { name: /create/i });
    expect(submit).toBeDisabled();
    expect(screen.getByText(HINT_TEXT)).toBeInTheDocument();
  });

  it("enables submit and hides the hint once both program and semester are selected", async () => {
    // Validates Requirement 12.4 — selecting both values clears the gate.
    const user = userEvent.setup();
    render(<FeeManager />, { wrapper: createWrapper() });

    // Select a program.
    await user.click(getTriggerByPlaceholder("Select a program"));
    await user.click(
      within(await screen.findByRole("listbox")).getByRole("option", {
        name: "Computer Science",
      })
    );

    // Still gated until a semester is also chosen.
    expect(screen.getByRole("button", { name: /create/i })).toBeDisabled();

    // Select a semester.
    await user.click(getTriggerByPlaceholder("Select a semester"));
    await user.click(
      within(await screen.findByRole("listbox")).getByRole("option", {
        name: "Fall 2025 (FA25)",
      })
    );

    // Both selected → submit enabled and the hint is gone.
    expect(screen.getByRole("button", { name: /create/i })).toBeEnabled();
    expect(screen.queryByText(HINT_TEXT)).not.toBeInTheDocument();
  });
});
