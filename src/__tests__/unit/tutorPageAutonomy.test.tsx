// @vitest-environment happy-dom
// =============================================================================
// TutorPage — Unit tests (autonomy-update failure surfacing)
// Feature: student-experience-remediation, Task 12.4 (wires Task 12.3)
// Validates: Requirements 28.1
// -----------------------------------------------------------------------------
// TutorPage wires the student-facing autonomy toggle to the *real*
// `useUpdateConversationAutonomy` mutation. When the underlying update fails,
// the hook's `onError` must surface a Sonner toast so the failure is never
// silently discarded (R28.1, R28.3).
//
// This test exercises the full page wiring end-to-end:
//   TutorPage.handleAutonomyChange -> updateAutonomy.mutate -> mutationFn
//     -> (mocked) supabase update returns { error } -> onError -> toast.error
//
// Sibling tutor data hooks are mocked so the test stays focused on the
// autonomy path; `useUpdateConversationAutonomy` itself is left REAL.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import type { ReactNode } from "react";

import i18n from "@/lib/i18n";

// ─── Supabase mock (drives the autonomy update outcome) ──────────────────────
// `supabase.from("tutor_conversations").update({...}).eq("id", convId)` resolves
// to `{ error }`. The `eq` result is configurable per test.

const eqMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn((_table: string) => ({ update: updateMock }));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => fromMock(table),
  },
}));

// ─── Sonner mock ─────────────────────────────────────────────────────────────

const toastErrorMock = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (msg: string) => toastErrorMock(msg) },
}));

// ─── Sibling tutor hooks (mocked; not under test here) ───────────────────────

const ACTIVE_CONVERSATION = {
  id: "conv-1",
  persona: "socratic_guide",
  autonomy_override: null,
};

vi.mock("@/hooks/useTutorConversations", () => ({
  useTutorConversations: () => ({
    data: [ACTIVE_CONVERSATION],
    isLoading: false,
  }),
  useCreateConversation: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteConversation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useTutorMessages", () => ({
  useTutorMessages: () => ({ data: [], isLoading: false }),
  useSendMessage: () => ({ mutate: vi.fn(), isPending: false }),
  useRateMessage: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useTutorUsage", () => ({
  useTutorUsage: () => ({ data: undefined }),
}));

// ChatPanel calls this hook at render; stub it so no real upload path runs.
vi.mock("@/hooks/useTutorAttachmentUpload", () => ({
  useTutorAttachmentUpload: () => ({ uploadAttachment: vi.fn() }),
}));

// ─── Harness ─────────────────────────────────────────────────────────────────

import TutorPage from "@/pages/student/tutor/TutorPage";

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });

const renderPage = (children: ReactNode) =>
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter initialEntries={["/student/tutor/conv-1"]}>
          <Routes>
            <Route path="/student/tutor/:conversationId" element={children} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("TutorPage — autonomy update failure handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("surfaces a Sonner toast when the autonomy update fails (R28.1)", async () => {
    eqMock.mockResolvedValueOnce({ error: new Error("update denied") });

    renderPage(<TutorPage />);

    // The autonomy toggle is rendered inside the chat header.
    const figureItOut = await screen.findByRole("radio", {
      name: /figure it out/i,
    });

    await userEvent.click(figureItOut);

    // The page wiring routes the failure through the hook's onError -> toast.
    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith("update denied")
    );

    // The update was attempted against the correct table/column/row.
    expect(fromMock).toHaveBeenCalledWith("tutor_conversations");
    expect(updateMock).toHaveBeenCalledWith({ autonomy_override: "L1" });
    expect(eqMock).toHaveBeenCalledWith("id", "conv-1");
  });

  it("does not toast when the autonomy update succeeds", async () => {
    eqMock.mockResolvedValueOnce({ error: null });

    renderPage(<TutorPage />);

    const figureItOut = await screen.findByRole("radio", {
      name: /figure it out/i,
    });

    await userEvent.click(figureItOut);

    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith({ autonomy_override: "L1" })
    );
    expect(toastErrorMock).not.toHaveBeenCalled();
  });
});
