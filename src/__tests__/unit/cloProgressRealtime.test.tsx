// =============================================================================
// CLOProgress — Realtime wiring unit tests
// Validates: Requirement 44.4 — CLO Progress updates in real time
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mocks ───────────────────────────────────────────────────────────────────

let capturedRealtimeOptions: Record<string, unknown> | null = null;

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "student-123" },
    profile: { role: "student", institution_id: "inst-1" },
    role: "student",
    institutionId: "inst-1",
  }),
}));

vi.mock("@/hooks/useRealtime", () => ({
  useRealtime: (options: Record<string, unknown>) => {
    capturedRealtimeOptions = options;
    return { isLive: true };
  },
}));

const mockCourseGroups = [
  {
    course_id: "c1",
    course_name: "Math 101",
    entries: [
      {
        clo_id: "clo-1",
        clo_title: "Solve equations",
        blooms_level: "applying",
        attainment_percent: 78,
        attainment_level: "Satisfactory",
        sample_count: 3,
        course_name: "Math 101",
        course_id: "c1",
      },
    ],
  },
];

vi.mock("@/hooks/useCLOProgress", () => ({
  useCLOProgress: () => ({
    data: mockCourseGroups,
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useCLOEvidence", () => ({
  useCLOEvidence: () => ({ data: [], isLoading: false }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      initial: _i,
      animate: _a,
      transition: _t,
      exit: _e,
      ...rest
    }: Record<string, unknown>) => {
      return <div {...rest}>{children as React.ReactNode}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/components/shared/CLOProgressBar", () => ({
  default: ({ title }: { title: string }) => (
    <div data-testid="clo-progress-bar">{title}</div>
  ),
}));

vi.mock("@/components/shared/Shimmer", () => ({
  default: ({ className }: { className: string }) => (
    <div data-testid="shimmer" className={className} />
  ),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

import CLOProgress from "@/pages/student/progress/CLOProgress";

const createQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderComponent = () => {
  const queryClient = createQueryClient();
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CLOProgress />
        </MemoryRouter>
      </QueryClientProvider>
    ),
  };
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("CLOProgress — Realtime wiring (Requirement 44.4)", () => {
  beforeEach(() => {
    capturedRealtimeOptions = null;
  });

  it("subscribes to outcome_attainment table via useRealtime", () => {
    renderComponent();
    expect(capturedRealtimeOptions).not.toBeNull();
    expect(capturedRealtimeOptions!.table).toBe("outcome_attainment");
  });

  it("scopes the realtime filter to the current student ID", () => {
    renderComponent();
    expect(capturedRealtimeOptions!.filter).toBe("student_id=eq.student-123");
  });

  it("subscribes to all event types (INSERT, UPDATE, DELETE)", () => {
    renderComponent();
    expect(capturedRealtimeOptions!.event).toBe("*");
  });

  it("provides a polling fallback function", () => {
    renderComponent();
    expect(capturedRealtimeOptions!.pollingFn).toBeTypeOf("function");
  });

  it("sets polling interval to 30 seconds", () => {
    renderComponent();
    expect(capturedRealtimeOptions!.pollingInterval).toBe(30_000);
  });

  it("invalidates outcomeAttainment queries on realtime payload", () => {
    const { queryClient } = renderComponent();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    // Simulate a realtime payload arriving
    const onPayload = capturedRealtimeOptions!.onPayload as () => void;
    onPayload();

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["outcomeAttainment", "list"],
      })
    );
  });

  it("also invalidates evidence queries on realtime payload", () => {
    const { queryClient } = renderComponent();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const onPayload = capturedRealtimeOptions!.onPayload as () => void;
    onPayload();

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["evidence", "list"],
      })
    );
  });

  it("invalidates outcomeAttainment queries on polling fallback", () => {
    const { queryClient } = renderComponent();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const pollingFn = capturedRealtimeOptions!.pollingFn as () => void;
    pollingFn();

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["outcomeAttainment", "list"],
      })
    );
  });

  it("renders CLO progress bars when data is available", () => {
    renderComponent();
    expect(screen.getByText("Solve equations")).toBeInTheDocument();
  });
});
