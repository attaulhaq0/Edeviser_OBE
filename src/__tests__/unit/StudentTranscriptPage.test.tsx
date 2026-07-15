// StudentTranscriptPage — functional render tests (net-new screen, P3.6).
// Feature: prototype-frontend-rebuild. Pixel parity is verified separately via
// the visual harness once routed; this covers behavior across all states.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StudentTranscriptPage from "@/features/student/transcript/StudentTranscriptPage";

// Controllable mutation stand-in for useGenerateTranscript.
const hoisted = vi.hoisted(() => ({
  mutation: {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    data: undefined as { download_url: string; file_name: string } | undefined,
  },
}));

vi.mock("@/hooks/useTranscript", () => ({
  useGenerateTranscript: () => hoisted.mutation,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "student-1234abcd" },
    profile: { full_name: "Sarah Ahmed" },
    role: "student",
    institutionId: null,
    isLoading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    refetchProfile: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_key: string, def?: string) => def ?? _key }),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <StudentTranscriptPage />
    </MemoryRouter>
  );

beforeEach(() => {
  hoisted.mutation.mutate = vi.fn();
  hoisted.mutation.isPending = false;
  hoisted.mutation.isError = false;
  hoisted.mutation.isSuccess = false;
  hoisted.mutation.data = undefined;
});

describe("StudentTranscriptPage", () => {
  it("renders the student identity and the official-transcript action (idle)", () => {
    renderPage();
    expect(screen.getByText("Sarah Ahmed")).toBeInTheDocument();
    expect(screen.getByText("Official transcript")).toBeInTheDocument();
    expect(screen.getByTestId("transcript-generate")).not.toBeDisabled();
  });

  it("requests the transcript for the current student on click", () => {
    renderPage();
    fireEvent.click(screen.getByTestId("transcript-generate"));
    expect(hoisted.mutation.mutate).toHaveBeenCalledWith(
      { student_id: "student-1234abcd" },
      expect.anything()
    );
  });

  it("shows a disabled button and progress copy while generating", () => {
    hoisted.mutation.isPending = true;
    renderPage();
    expect(screen.getByTestId("transcript-generate")).toBeDisabled();
    expect(
      screen.getByText("Generating your official transcript…")
    ).toBeInTheDocument();
  });

  it("surfaces an error state", () => {
    hoisted.mutation.isError = true;
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not generate transcript. Please try again."
    );
  });

  it("shows the generated file name on success", () => {
    hoisted.mutation.isSuccess = true;
    hoisted.mutation.data = {
      download_url: "blob:transcript",
      file_name: "transcript_sarah_2026.pdf",
    };
    renderPage();
    expect(screen.getByText("transcript_sarah_2026.pdf")).toBeInTheDocument();
  });
});
