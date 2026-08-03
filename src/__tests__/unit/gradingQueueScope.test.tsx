import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GradingQueuePage from "@/pages/teacher/grading/GradingQueuePage";
import { useAuth } from "@/hooks/useAuth";
import { useCourses } from "@/hooks/useCourses";
import { useSubmissions } from "@/hooks/useSubmissions";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useCourses", () => ({ useCourses: vi.fn() }));
vi.mock("@/hooks/useSubmissions", () => ({ useSubmissions: vi.fn() }));
vi.mock("@/hooks/useAssignments", () => ({
  useAssignments: vi.fn(() => ({ data: { data: [] } })),
}));
vi.mock("@/hooks/useCourseSections", () => ({
  useCourseSections: vi.fn(() => ({ data: [] })),
}));
vi.mock("nuqs", () => ({
  parseAsString: { withDefault: (value: string) => value },
  useQueryState: vi.fn(() => ["", vi.fn()]),
}));
vi.mock("@/components/shared/DataTable", () => ({
  DataTable: ({
    data,
    emptyState,
  }: {
    data: unknown[];
    emptyState?: React.ReactNode;
  }) => <div>{data.length === 0 ? emptyState : `${data.length} rows`}</div>,
}));

describe("GradingQueuePage teacher scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "teacher-1" },
    } as ReturnType<typeof useAuth>);
    vi.mocked(useCourses).mockReturnValue({
      data: {
        data: [
          {
            id: "course-1",
            code: "CS101",
            name: "Foundations",
          },
        ],
        count: 1,
        page: 1,
        pageSize: 100,
      },
    } as ReturnType<typeof useCourses>);
    vi.mocked(useSubmissions).mockReturnValue({
      data: { data: [], count: 0, page: 1, pageSize: 20 },
      isLoading: false,
      isFetching: false,
    } as unknown as ReturnType<typeof useSubmissions>);
  });

  it("limits courses and pending submissions to the signed-in teacher", () => {
    render(<GradingQueuePage />);

    expect(useCourses).toHaveBeenCalledWith({
      teacherId: "teacher-1",
      pageSize: 100,
    });
    expect(useSubmissions).toHaveBeenCalledWith(
      expect.objectContaining({
        courseIds: ["course-1"],
        pendingOnly: true,
      })
    );
  });

  it("shows a caught-up state when the teacher has courses but no pending work", () => {
    render(<GradingQueuePage />);

    expect(
      screen.getByRole("heading", { name: "empty.noSubmissions.title" })
    ).toBeInTheDocument();
    expect(screen.queryByText("empty.noCourses.title")).not.toBeInTheDocument();
  });
});
