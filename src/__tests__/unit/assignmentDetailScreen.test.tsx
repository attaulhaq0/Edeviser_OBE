// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ZodError } from "zod";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import i18n from "@/lib/i18n";
import {
  validateFile,
  SUBMISSION_ALLOWED_EXTENSIONS,
  SUBMISSION_FILE_ACCEPT,
  SUBMISSION_MAX_FILE_SIZE_MB,
} from "@/lib/fileUpload";
import type { AssignmentWithRelations } from "@/hooks/useAssignments";

const submissionMocks = vi.hoisted(() => ({
  upload: vi.fn(),
  create: vi.fn(),
  error: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { error: submissionMocks.error, info: vi.fn(), success: vi.fn() },
}));

const state: {
  assignment: AssignmentWithRelations | null;
} = {
  assignment: null,
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));
vi.mock("@/lib/activityLogger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/analyticsConsent", () => ({ captureAnalyticsEvent: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "student-1" },
    profile: {
      id: "student-1",
      institution_id: "inst-1",
    },
  }),
}));

vi.mock("@/hooks/useAssignments", () => ({
  useAssignment: () => ({
    data: state.assignment,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useStudentCourses", () => ({
  useStudentCourses: () => ({
    data: [
      {
        id: "course-1",
        name: "Database Design",
      },
    ],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/useSubmissions", () => ({
  useSubmissions: () => ({
    data: { data: [] },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateSubmission: () => ({
    mutateAsync: submissionMocks.create,
    isPending: false,
  }),
  useUploadSubmissionFile: () => ({
    mutateAsync: submissionMocks.upload,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useAdaptiveXP", () => ({
  useAssignmentDifficultyBonus: () => ({
    data: { bloomsLevel: "analyzing", multiplier: 1.5 },
  }),
}));

vi.mock("@/hooks/useReadHabitTimer", () => ({
  useReadHabitTimer: () => ({ elapsedSeconds: 12, isCompleted: false }),
}));

vi.mock("@/hooks/useOptimisticXP", () => ({
  useOptimisticXP: () => ({
    awardXPOptimistic: vi.fn(),
  }),
}));

vi.mock("@/lib/storageUrl", () => ({
  getSignedUrl: vi.fn(async () => null),
}));

import AssignmentDetailScreen from "@/features/student/assignments/AssignmentDetailScreen";

const renderPage = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={["/student/assignments/assignment-1"]}>
        <Routes>
          <Route
            path="/student/assignments/:id"
            element={<AssignmentDetailScreen />}
          />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  submissionMocks.upload.mockResolvedValue("student-1/generated-answer.txt");
  submissionMocks.create.mockResolvedValue({
    id: "receipt-1",
    assignment_id: "assignment-1",
    student_id: "student-1",
    file_url: "student-1/generated-answer.txt",
    is_late: false,
    submitted_at: "2026-09-20T23:59:59.900+00:00",
    status: "submitted",
  });
  state.assignment = {
    id: "assignment-1",
    title: "Data Interpretation Challenge",
    description: "Interpret the data.",
    course_id: "course-1",
    due_date: "2099-07-29T17:00:00Z",
    total_marks: 100,
    clo_weights: [],
    late_window_hours: 4,
    prerequisites: null,
    created_at: "2026-07-01T00:00:00Z",
    rubrics: null,
    courses: null,
  };
});

describe("AssignmentDetailScreen", () => {
  it("advertises only the production validator's supported file types and 10MB client cap", () => {
    const { container } = renderPage();
    const accept = container
      .querySelector('input[type="file"]')!
      .getAttribute("accept");
    expect(accept).toBe(SUBMISSION_FILE_ACCEPT);
    for (const extension of accept!.split(",")) {
      expect(() =>
        validateFile(new File(["answer"], `answer${extension}`))
      ).not.toThrow();
    }
    expect(accept).not.toMatch(/ppt|image\/\*/);
    expect(() => validateFile(new File(["answer"], "answer.pptx"))).toThrow();
    expect(SUBMISSION_MAX_FILE_SIZE_MB).toBe(10);
    expect(
      screen.getByText(
        i18n.t("assignments.detail.fileRequirements", {
          ns: "student",
          formats: SUBMISSION_ALLOWED_EXTENSIONS.join(", ").toUpperCase(),
          size: SUBMISSION_MAX_FILE_SIZE_MB,
        })
      )
    ).toBeTruthy();
    expect(() =>
      validateFile(
        new File([new Uint8Array(10 * 1024 * 1024 + 1)], "answer.txt")
      )
    ).toThrow(/10MB/);
  });

  it("passes only the selected file to upload and persists its returned key with assignment scope", async () => {
    const { container } = renderPage();
    const selected = new File(["Answer"], "answer.txt", { type: "text/plain" });
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [selected] },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit assignment/i }));
    await waitFor(() => expect(submissionMocks.create).toHaveBeenCalled());
    const intent = submissionMocks.upload.mock.calls[0]![0].intent;
    expect(intent.actorId).toBe("student-1");
    expect(submissionMocks.upload).toHaveBeenCalledExactlyOnceWith({
      file: selected,
      intent,
    });
    expect(submissionMocks.create).toHaveBeenCalledWith({
      assignment_id: "assignment-1",
      file_url: "student-1/generated-answer.txt",
      institution_id: "inst-1",
      is_late: false,
      intent,
    });
  });

  it("shows translated ownership validation feedback without submitting metadata", async () => {
    submissionMocks.upload.mockRejectedValue(
      new ZodError([
        {
          code: "custom",
          path: ["file_url"],
          message: "internal validation details",
        },
      ])
    );
    const { container } = renderPage();
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [new File(["Answer"], "answer.txt")] },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit assignment/i }));
    await waitFor(() =>
      expect(submissionMocks.error).toHaveBeenCalledWith(
        i18n.t("assignments.detail.invalidSubmissionFile", { ns: "student" })
      )
    );
    expect(submissionMocks.create).not.toHaveBeenCalled();
    expect(screen.queryByText("internal validation details")).toBeNull();
  });
  it("renders the prototype-style assignment summary and submission actions", () => {
    state.assignment = {
      id: "assignment-1",
      title: "Database Assignment 3",
      description:
        "Design a normalized schema for a library management system. Apply 1NF, 2NF, and 3NF.",
      course_id: "course-1",
      due_date: "2026-07-29T17:00:00Z",
      total_marks: 100,
      clo_weights: [{ clo_id: "clo-1", weight: 40 }],
      late_window_hours: 4,
      prerequisites: null,
      created_at: "2026-07-01T00:00:00Z",
      rubrics: { title: "Normalization rubric" },
      courses: { name: "Database Design" },
    };

    renderPage();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Database Assignment 3",
      })
    ).toBeTruthy();
    expect(screen.getAllByText("Database Design").length).toBeGreaterThan(0);
    expect(screen.getByText("100")).toBeTruthy();
    expect(screen.getByText("Submit your work")).toBeTruthy();
    expect(screen.getByText("Tap to upload your file")).toBeTruthy();
    expect(
      screen.getByRole("link", {
        name: /Need help before submitting\?/,
      })
    ).toBeTruthy();
    expect(screen.getByText("Your submission")).toBeTruthy();
  });

  it("resolves the course name from enrollment data when the detail relation is absent", () => {
    state.assignment = {
      id: "assignment-1",
      title: "Database Assignment 3",
      description: "Design a normalized schema.",
      course_id: "course-1",
      due_date: "2026-07-29T17:00:00Z",
      total_marks: 100,
      clo_weights: [],
      late_window_hours: 4,
      prerequisites: null,
      created_at: "2026-07-01T00:00:00Z",
      rubrics: null,
      courses: null,
    };

    renderPage();

    expect(screen.getAllByText("Database Design").length).toBeGreaterThan(0);
    expect(screen.queryByText("Course")).toBeNull();
  });
});
