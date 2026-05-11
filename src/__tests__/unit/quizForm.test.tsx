// =============================================================================
// QuizForm — Unit tests
// Validates: Task 16.8 — PracticeModeToggle integration in quiz creation/edit form
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock hooks before importing the component
vi.mock("@/hooks/useQuizzes", () => ({
  useQuiz: vi.fn().mockReturnValue({ data: null, isLoading: false }),
  useCreateQuiz: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
  useUpdateQuiz: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useCourses", () => ({
  useCourses: vi.fn().mockReturnValue({
    data: {
      data: [{ id: "course-1", code: "CS101", name: "Intro to CS" }],
      count: 1,
    },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useCLOs", () => ({
  useCLOs: vi.fn().mockReturnValue({
    data: {
      data: [{ id: "clo-1", title: "CLO 1: Understand basics" }],
      count: 1,
    },
    isLoading: false,
  }),
}));

import QuizForm from "@/pages/teacher/quizzes/QuizForm";

const createWrapper = (
  initialRoute = "/teacher/courses/course-1/quizzes/new"
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route
            path="/teacher/courses/:courseId/quizzes/new"
            element={children}
          />
          <Route
            path="/teacher/courses/:courseId/quizzes/:id/edit"
            element={children}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("QuizForm — PracticeModeToggle integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the PracticeModeToggle with "Allow Practice Mode" label', () => {
    render(<QuizForm />, { wrapper: createWrapper() });
    expect(screen.getByText("Allow Practice Mode")).toBeDefined();
  });

  it("renders the practice mode description text", () => {
    render(<QuizForm />, { wrapper: createWrapper() });
    expect(
      screen.getByText("Students can take this quiz without grade impact")
    ).toBeDefined();
  });

  it("renders the practice mode switch unchecked by default", () => {
    render(<QuizForm />, { wrapper: createWrapper() });
    const toggle = screen.getByRole("switch", { name: /allow practice mode/i });
    expect(toggle.getAttribute("data-state")).toBe("unchecked");
  });

  it("toggles practice mode switch on click", () => {
    render(<QuizForm />, { wrapper: createWrapper() });
    const toggle = screen.getByRole("switch", { name: /allow practice mode/i });
    expect(toggle.getAttribute("data-state")).toBe("unchecked");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("data-state")).toBe("checked");
  });
});

describe("QuizForm — Adaptive mode toggle", () => {
  it("renders the adaptive mode toggle", () => {
    render(<QuizForm />, { wrapper: createWrapper() });
    expect(screen.getByText("Enable Adaptive Mode")).toBeDefined();
  });

  it("does not show adaptation config fields when adaptive is off", () => {
    render(<QuizForm />, { wrapper: createWrapper() });
    expect(screen.queryByLabelText(/initial difficulty/i)).toBeNull();
  });

  it("shows adaptation config fields when adaptive is toggled on", () => {
    render(<QuizForm />, { wrapper: createWrapper() });
    const adaptiveToggle = screen.getByRole("switch", {
      name: /enable adaptive mode/i,
    });
    fireEvent.click(adaptiveToggle);
    expect(screen.getByLabelText(/initial difficulty/i)).toBeDefined();
    expect(screen.getByLabelText(/step up/i)).toBeDefined();
    expect(screen.getByLabelText(/step down/i)).toBeDefined();
  });
});

describe("QuizForm — Page structure", () => {
  it('renders "Create Quiz" heading in create mode', () => {
    render(<QuizForm />, { wrapper: createWrapper() });
    const heading = screen.getByRole("heading", { name: "Create Quiz" });
    expect(heading).toBeDefined();
  });

  it("renders the publish toggle", () => {
    render(<QuizForm />, { wrapper: createWrapper() });
    expect(screen.getByText("Publish Quiz")).toBeDefined();
  });

  it("renders the Quiz Settings section", () => {
    render(<QuizForm />, { wrapper: createWrapper() });
    expect(screen.getByText("Quiz Settings")).toBeDefined();
  });
});
