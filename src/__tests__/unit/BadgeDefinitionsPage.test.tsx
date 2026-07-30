import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import BadgeDefinitionsPage from "@/pages/admin/badges/BadgeDefinitionsPage";
import type { BadgeDefinition } from "@/hooks/useBadgeDefinitions";

const hoisted = vi.hoisted(() => ({
  query: {
    data: [] as BadgeDefinition[],
    isLoading: false,
    isError: false,
  },
  create: {
    mutate: vi.fn(),
    isPending: false,
  },
  update: {
    mutate: vi.fn(),
    isPending: false,
  },
  remove: {
    mutate: vi.fn(),
    isPending: false,
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ institutionId: "institution-1" }),
}));

vi.mock("@/hooks/useBadgeDefinitions", () => ({
  useBadgeDefinitions: () => hoisted.query,
  useCreateBadgeDefinition: () => hoisted.create,
  useUpdateBadgeDefinition: () => hoisted.update,
  useDeleteBadgeDefinition: () => hoisted.remove,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const definition: BadgeDefinition = {
  id: "badge-1",
  institution_id: "institution-1",
  badge_key: "streak_keeper",
  name: "Streak Keeper",
  description: "Build a consistent learning streak",
  emoji: "🔥",
  category: "consistency",
  tier_conditions: {
    bronze: { description: "7-day streak" },
    silver: { description: "14-day streak" },
    gold: { description: "30-day streak" },
  },
  is_archived: false,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <BadgeDefinitionsPage />
    </MemoryRouter>
  );

beforeEach(() => {
  hoisted.query.data = [];
  hoisted.query.isLoading = false;
  hoisted.query.isError = false;
  hoisted.create.mutate.mockReset();
  hoisted.update.mutate.mockReset();
  hoisted.remove.mutate.mockReset();
});

describe("BadgeDefinitionsPage", () => {
  it("renders backend definitions and their tier thresholds", () => {
    hoisted.query.data = [definition];
    renderPage();

    expect(screen.getByText("Badge Definitions")).toBeInTheDocument();
    expect(screen.getByText("Streak Keeper")).toBeInTheDocument();
    expect(
      screen.getByText(
        "🥉 Bronze: 7-day streak · 🥈 Silver: 14-day streak · 🥇 Gold: 30-day streak"
      )
    ).toBeInTheDocument();
    expect(screen.getByText("streak_keeper")).toBeInTheDocument();
  });

  it("opens the create editor with all progression fields", () => {
    renderPage();
    fireEvent.click(screen.getAllByRole("button", { name: "New badge" })[0]!);

    expect(
      screen.getByRole("heading", { name: "Create badge definition" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Badge key")).toBeInTheDocument();
    expect(screen.getByLabelText("🥉 Bronze")).toBeInTheDocument();
    expect(screen.getByLabelText("🥈 Silver")).toBeInTheDocument();
    expect(screen.getByLabelText("🥇 Gold")).toBeInTheDocument();
  });

  it("submits a new definition through the mutation hook", async () => {
    renderPage();
    fireEvent.click(screen.getAllByRole("button", { name: "New badge" })[0]!);
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Course Finisher" },
    });
    fireEvent.change(screen.getByLabelText("Badge key"), {
      target: { value: "course_finisher" },
    });
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "academic" },
    });
    fireEvent.change(screen.getByLabelText("🥉 Bronze"), {
      target: { value: "Complete 1 course" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create badge" }));

    await waitFor(() =>
      expect(hoisted.create.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          institutionId: "institution-1",
          input: expect.objectContaining({
            name: "Course Finisher",
            badge_key: "course_finisher",
            category: "academic",
            tier_conditions: expect.objectContaining({
              bronze: { description: "Complete 1 course" },
            }),
          }),
        }),
        expect.any(Object)
      )
    );
  });
});
