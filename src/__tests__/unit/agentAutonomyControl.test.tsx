// Feature: Institution autonomy control (tasks.md 7.2/3.1/3.6 — Wave B + D).
// AgentAutonomyControl contract: surfaces the institution-level A3 feature
// flags (ceiling, auto-execute low-risk, rollback) from the RLS-readable
// institution_autonomy_settings table. Mutations remain server-governed —
// the RLS policy allows admin-only writes, and the orchestrator re-reads
// settings per run (fail-closed). The hook is mocked; i18n is key-passthrough.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => ({
  useInstitutionAutonomy: vi.fn(),
}));

vi.mock("@/ai/hooks/useInstitutionAutonomy", () => ({
  useInstitutionAutonomy: mocks.useInstitutionAutonomy,
}));
vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));
vi.mock("sonner", () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { toast, Toaster: () => null };
});
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
  Trans: ({ children }: { children?: ReactNode }) => children,
}));

import AgentAutonomyControl from "@/ai/components/AgentAutonomyControl";

// Raw DB row shape (snake_case) as returned by useInstitutionAutonomy() —
// the component's Zod schema parses THIS shape, so the mock must use the real
// field name (operational_autonomy_ceiling). A3 is asserted (non-default) to
// prove the live value flows through parsing into the render, not the default.
const settings = {
  operational_autonomy_ceiling: "A3",
  auto_execute_low_risk: true,
  rollback_enabled: false,
};

const renderControl = (
  overrides: Partial<{
    data: unknown;
    isLoading: boolean;
    isError: boolean;
  }> = {}
) => {
  mocks.useInstitutionAutonomy.mockReturnValue({
    data: settings,
    isLoading: false,
    isError: false,
    ...overrides,
  });
  return render(<AgentAutonomyControl />);
};

describe("AgentAutonomyControl (tasks.md 7.2 governance surface, 3.6 suite)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the live autonomy posture from the RLS-readable settings row", () => {
    const { container, getByText } = renderControl();
    expect(container).toBeTruthy();
    expect(mocks.useInstitutionAutonomy).toHaveBeenCalledTimes(1);
    expect(mocks.useInstitutionAutonomy).toHaveBeenCalledWith();
    // A3 (non-default) proves the parsed live row — not the A2 fallback —
    // drives the render.
    expect(getByText("A3")).toBeTruthy();
  });

  it("renders the fail-closed default posture when no settings row exists", () => {
    const { getByText } = renderControl({ data: null });
    expect(getByText("A2")).toBeTruthy();
    expect(getByText("autonomyControl.defaultPosture")).toBeTruthy();
  });

  it("renders unavailability without crashing on query error", () => {
    const { getByText } = renderControl({ isError: true });
    expect(getByText("autonomyControl.unavailable")).toBeTruthy();
  });
});
