import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockLogActivity = vi.fn();
vi.mock("@/lib/activityLogger", () => ({
  logActivity: (...args: unknown[]) => mockLogActivity(...args),
}));

let mockPathname = "/student/dashboard";
vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: mockPathname }),
}));

let mockProfile: { id: string; role: string } | null = null;
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ profile: mockProfile }),
}));

// We need renderHook from testing-library
import { renderHook } from "@testing-library/react";
import { usePageViewLogger } from "@/hooks/usePageViewLogger";

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("usePageViewLogger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/student/dashboard";
    mockProfile = null;
  });

  it("does not log on first page visit (logs on navigation away)", () => {
    mockProfile = { id: "student-1", role: "student" };
    renderHook(() => usePageViewLogger());

    // First visit records the path but doesn't log until navigating away
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it("logs page_view with duration_seconds when student navigates away", () => {
    mockProfile = { id: "student-1", role: "student" };
    const { rerender } = renderHook(() => usePageViewLogger());

    // Navigate to a new page
    mockPathname = "/student/assignments";
    rerender();

    expect(mockLogActivity).toHaveBeenCalledTimes(1);
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: "student-1",
        event_type: "page_view",
        metadata: expect.objectContaining({
          path: "/student/dashboard",
          duration_seconds: expect.any(Number),
        }),
      })
    );
  });

  it("does not log when profile is null", () => {
    mockProfile = null;
    renderHook(() => usePageViewLogger());

    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it("does not log for non-student roles", () => {
    mockProfile = { id: "teacher-1", role: "teacher" };
    const { rerender } = renderHook(() => usePageViewLogger());

    mockPathname = "/teacher/courses";
    rerender();

    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it("does not log duplicate for same pathname", () => {
    mockProfile = { id: "student-1", role: "student" };
    const { rerender } = renderHook(() => usePageViewLogger());

    // Re-render with same pathname
    rerender();
    expect(mockLogActivity).not.toHaveBeenCalled();
  });
});
