// @vitest-environment happy-dom
// =============================================================================
// StudentJournalPage — prompt seeding & unguided fallback (Task 17.2)
//
// Covers Requirement 10:
//  - R10.2: selecting a reflection prompt seeds the journal entry content
//  - R10.3a: when the CLO-contextual generator is unavailable (no course/CLO
//            context), a basic unguided journal remains usable so journaling
//            is always possible.
//
// The pure seeding helper (`seedContentWithPrompt`) is also exercised directly,
// since it is the core logic the page wiring depends on.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";

import i18n from "@/lib/i18n";
import { seedContentWithPrompt } from "@/lib/reflectionPrompts";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "student-1" } }),
}));

vi.mock("@/hooks/useJournal", () => ({
  useJournalEntries: () => ({ data: [], isLoading: false }),
  useCreateJournalEntry: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

// No CLO context → the guided generator is unavailable and the page falls back
// to the static templates + free-text (R10.3a).
vi.mock("@/hooks/useCLOs", () => ({
  useCLOs: () => ({ data: undefined }),
}));

// `useEnrolledCourseOptions` is an in-page query that reads supabase directly.
// A thenable builder lets the awaited `.from(...).select(...).eq(...).eq(...)`
// chain resolve to an empty course list (the courses are irrelevant here).
vi.mock("@/lib/supabase", () => {
  interface Builder {
    select: () => Builder;
    eq: () => Builder;
    order: () => Builder;
    then: (
      resolve: (value: { data: unknown[]; error: null }) => unknown
    ) => Promise<unknown>;
  }
  const builder: Builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    then: (resolve) => Promise.resolve({ data: [], error: null }).then(resolve),
  };
  return { supabase: { from: () => builder } };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

import StudentJournalPage from "@/pages/student/journal/StudentJournalPage";

const createQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderPage = () =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <I18nextProvider i18n={i18n}>
        <StudentJournalPage />
      </I18nextProvider>
    </QueryClientProvider>
  );

const openNewEntryDialog = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: /New Entry/i }));
};

// ─── Pure helper: seedContentWithPrompt (R10.2 core logic) ───────────────────

describe("seedContentWithPrompt", () => {
  it("seeds empty content with the selected prompt", () => {
    const result = seedContentWithPrompt("", "What did I learn today?");
    expect(result).toContain("What did I learn today?");
    expect(result.startsWith("What did I learn today?")).toBe(true);
  });

  it("appends the prompt without losing existing writing", () => {
    const result = seedContentWithPrompt(
      "I already wrote this.",
      "What confused me?"
    );
    expect(result).toContain("I already wrote this.");
    expect(result).toContain("What confused me?");
    // Existing content stays ahead of the appended prompt.
    expect(result.indexOf("I already wrote this.")).toBeLessThan(
      result.indexOf("What confused me?")
    );
  });

  it("trims surrounding whitespace from prior content before appending", () => {
    const result = seedContentWithPrompt("   \n  ", "What am I proud of?");
    expect(result.startsWith("What am I proud of?")).toBe(true);
  });
});

// ─── Component: prompt seeding & unguided fallback ───────────────────────────

describe("StudentJournalPage — prompts & fallback", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("en");
  });

  it("seeds the entry content when a reflection prompt is selected (R10.2)", async () => {
    const user = userEvent.setup();
    renderPage();
    await openNewEntryDialog(user);

    // The static reflection templates are offered inside the dialog.
    const promptButton = screen.getByRole("button", {
      name: /What did I learn today/i,
    });
    await user.click(promptButton);

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toContain("What did I learn today?");
  });

  it("appends a second prompt to already-seeded content without overwriting (R10.2)", async () => {
    const user = userEvent.setup();
    renderPage();
    await openNewEntryDialog(user);

    await user.click(
      screen.getByRole("button", { name: /What did I learn today/i })
    );
    await user.click(screen.getByRole("button", { name: /What confused me/i }));

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toContain("What did I learn today?");
    expect(textarea.value).toContain("What confused me?");
  });

  it("falls back to an unguided journal when no CLO context is available (R10.3a)", async () => {
    const user = userEvent.setup();
    renderPage();
    await openNewEntryDialog(user);

    // Without a selected course/CLO, the guided generator block is not shown…
    expect(screen.queryByText("Guided reflection")).not.toBeInTheDocument();

    // …yet the basic journal remains usable: the free-text area accepts input.
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    await user.type(textarea, "Today I reviewed my notes.");
    expect(textarea.value).toContain("Today I reviewed my notes.");
  });

  it("still offers reflection templates in the unguided fallback (R10.1/R10.3a)", async () => {
    const user = userEvent.setup();
    renderPage();
    await openNewEntryDialog(user);

    expect(
      screen.getByRole("button", { name: /What did I learn today/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /What confused me/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /What am I proud of/i })
    ).toBeInTheDocument();
  });
});
