import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { DataTable } from "@/components/shared/DataTable";
import { gradingQueueColumns } from "@/pages/teacher/grading/gradingQueueColumns";
import type { SubmissionWithRelations } from "@/hooks/useSubmissions";

describe("gradingQueueColumns", () => {
  it("renders the submission timestamp from submitted_at", () => {
    const submission: SubmissionWithRelations = {
      id: "submission-1",
      assignment_id: "assignment-1",
      student_id: "student-1",
      file_url: "submission.pdf",
      is_late: false,
      submitted_at: "2026-07-29T10:30:00.000Z",
      status: "submitted",
      profiles: {
        id: "student-1",
        full_name: "Aarav Sharma",
        email: "aarav@example.test",
      },
      assignments: {
        id: "assignment-1",
        title: "Place Value Quiz",
        total_marks: 100,
        course_id: "course-1",
      },
      grades: [],
    };

    render(
      <MemoryRouter>
        <DataTable columns={gradingQueueColumns} data={[submission]} />
      </MemoryRouter>
    );

    expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();
    expect(screen.getByText(/Jul 29, 2026/)).toBeInTheDocument();
  });
});
