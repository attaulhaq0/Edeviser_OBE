// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// ─── Mock every hook the component consumes so no real Supabase is hit ──────
//
// GraduateAttributeManager reads from:
//   - useAuth().profile.institution_id          (scopes the queries)
//   - useGraduateAttributes(institutionId)       (the attribute list)
//   - useGraduateAttributeAttainment(...)        (computed GA attainment)
//   - useGraduateAttributeMappings(attributeId)  (per-attribute, keyed by id)
//   - useILOs({ pageSize })                      (outcome id → title lookup)
//   - useCreateGraduateAttribute / useDeleteGraduateAttribute (Add form / delete)
//
// Three attributes are seeded to exercise all rendered states in one tree:
//   ga-1       → has mappings + attainment   (Req 6.1, 6.2, 6.6)
//   ga-2       → zero mappings → empty state  (Req 6.3)
//   ga-loading → mappings query loading       (shimmer placeholder)

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ profile: { institution_id: "inst-1" } }),
}));

vi.mock("@/hooks/useILOs", () => ({
  useILOs: vi.fn(() => ({
    data: {
      data: [
        { id: "ilo-1", title: "ILO-1: Analyze" },
        { id: "ilo-2", title: "ILO-2: Evaluate" },
      ],
      count: 2,
      page: 1,
      pageSize: 1000,
    },
  })),
}));

vi.mock("@/hooks/useGraduateAttributes", () => ({
  useGraduateAttributes: vi.fn(() => ({
    data: [
      {
        id: "ga-1",
        institution_id: "inst-1",
        name: "Critical Thinking",
        description: "Thinks critically",
        sort_order: 0,
        created_at: "2025-01-01",
      },
      {
        id: "ga-2",
        institution_id: "inst-1",
        name: "Communication",
        description: null,
        sort_order: 1,
        created_at: "2025-01-01",
      },
      {
        id: "ga-loading",
        institution_id: "inst-1",
        name: "Teamwork",
        description: null,
        sort_order: 2,
        created_at: "2025-01-01",
      },
    ],
    isLoading: false,
  })),
  useGraduateAttributeAttainment: vi.fn(() => ({
    data: [
      {
        attribute_id: "ga-1",
        name: "Critical Thinking",
        description: "Thinks critically",
        avg_attainment: 88,
        mapped_ilo_count: 2,
      },
      {
        attribute_id: "ga-2",
        name: "Communication",
        description: null,
        avg_attainment: 0,
        mapped_ilo_count: 0,
      },
    ],
  })),
  useGraduateAttributeMappings: vi.fn((attributeId?: string) => {
    if (attributeId === "ga-1") {
      return {
        data: [
          {
            id: "m-1",
            graduate_attribute_id: "ga-1",
            outcome_id: "ilo-1",
            weight: 60,
          },
          {
            id: "m-2",
            graduate_attribute_id: "ga-1",
            outcome_id: "ilo-2",
            weight: 40,
          },
        ],
        isLoading: false,
      };
    }
    if (attributeId === "ga-loading") {
      return { data: [], isLoading: true };
    }
    return { data: [], isLoading: false };
  }),
  useCreateGraduateAttribute: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useDeleteGraduateAttribute: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

import GraduateAttributeManager from "@/pages/admin/graduate-attributes/GraduateAttributeManager";

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe("GraduateAttributeManager", () => {
  it("renders the page title and each attribute", () => {
    render(<GraduateAttributeManager />, { wrapper: createWrapper() });

    expect(screen.getByText("Graduate Attributes")).toBeInTheDocument();
    expect(screen.getByText("Critical Thinking")).toBeInTheDocument();
    expect(screen.getByText("Communication")).toBeInTheDocument();
  });

  // ─── Req 6.1, 6.2, 6.6 — mapped outcomes + computed attainment ────────────

  it("renders mapped outcomes for an attribute that has mappings", () => {
    // Validates Requirement 6.1 — mapped outcomes from useGraduateAttributeMappings
    // are surfaced (resolved to readable outcome titles, not raw UUIDs).
    render(<GraduateAttributeManager />, { wrapper: createWrapper() });

    expect(screen.getByText("Mapped outcomes")).toBeInTheDocument();
    expect(screen.getByText("ILO-1: Analyze")).toBeInTheDocument();
    expect(screen.getByText("ILO-2: Evaluate")).toBeInTheDocument();
    // Mapping weights are shown alongside each outcome
    expect(screen.getByText("· 60%")).toBeInTheDocument();
    expect(screen.getByText("· 40%")).toBeInTheDocument();
  });

  it("renders computed attainment with the platform color coding", () => {
    // Validates Requirements 6.2 & 6.6 — attainment from useGraduateAttributeAttainment
    // is displayed as a percentage + level, color-coded via getAttainmentColor.
    render(<GraduateAttributeManager />, { wrapper: createWrapper() });

    const percent = screen.getByText("88%");
    expect(percent).toBeInTheDocument();
    // 88% ≥ 85 → "Excellent" classification
    expect(screen.getByText("Excellent")).toBeInTheDocument();
    // getAttainmentColor is applied as an inline background color
    expect(percent.style.backgroundColor).not.toBe("");
  });

  // ─── Req 6.3 — inline empty state when zero mappings ──────────────────────

  it("renders an inline empty state for an attribute with zero mappings", () => {
    // Validates Requirement 6.3 — a GA with no mappings shows a user-friendly
    // empty state rather than a bare zero.
    render(<GraduateAttributeManager />, { wrapper: createWrapper() });

    expect(screen.getByText("No outcomes mapped yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Map this attribute to institution outcomes to track attainment."
      )
    ).toBeInTheDocument();
  });

  // ─── Loading state — shimmer placeholder while mappings resolve ───────────

  it("renders a shimmer placeholder while an attribute's mappings are loading", () => {
    const { container } = render(<GraduateAttributeManager />, {
      wrapper: createWrapper(),
    });

    expect(container.querySelector(".animate-shimmer")).not.toBeNull();
  });
});
