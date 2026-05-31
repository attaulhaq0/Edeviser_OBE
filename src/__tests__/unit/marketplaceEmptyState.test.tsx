// @vitest-environment happy-dom
// =============================================================================
// Marketplace — empty-state fallback & seed-failure resilience (Task 19.4)
//
// Covers Requirement 12:
//  - R12.2: the Marketplace surface presents real/seeded items; when none are
//           available it must not be an empty surface — it renders the shared
//           NoMarketplaceItems empty state.
//  - R12.6: the genuine zero-data fallback uses the shared EmptyState library
//           (NoMarketplaceItems) rather than an inline ad-hoc empty state.
//  - R12.8: if the seed migrations fail to run, the surface SHALL still load
//           and render its empty-state component rather than being blocked.
//
// The MarketplacePage is verified for the zero-data path (paginated query
// returns an empty page) and for "no crash" mounting when the infinite query
// produced no data at all (seed-absent: data === undefined).
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";

import i18n from "@/lib/i18n";
import type { MarketplaceItemsPage } from "@/hooks/useMarketplace";

// ─── Mock state controls ─────────────────────────────────────────────────────

interface MockState {
  // `undefined` models a query that produced no data at all (seed-absent);
  // a defined object with empty pages models a genuine zero-data result.
  itemsPages: { pages: MarketplaceItemsPage[] } | undefined;
  isLoadingItems: boolean;
}

const state: MockState = {
  itemsPages: { pages: [{ items: [], page: 1, total: 0, hasMore: false }] },
  isLoadingItems: false,
};

const resetState = () => {
  state.itemsPages = {
    pages: [{ items: [], page: 1, total: 0, hasMore: false }],
  };
  state.isLoadingItems = false;
};

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "student-1" } }),
}));

vi.mock("@/hooks/useMarketplace", () => ({
  MARKETPLACE_PAGE_SIZE: 24,
  useMarketplaceItems: () => ({
    data: state.itemsPages,
    isLoading: state.isLoadingItems,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  }),
}));

vi.mock("@/hooks/useXPBalance", () => ({
  useXPBalance: () => ({ data: { balance: 0 }, isLoading: false }),
}));

vi.mock("@/hooks/useInventory", () => ({
  useInventory: () => ({ data: [] }),
}));

vi.mock("@/hooks/useLevel", () => ({
  useLevel: () => ({ data: { level: 1 } }),
}));

vi.mock("@/hooks/useActiveBoosts", () => ({
  useActiveBoosts: () => ({ data: [] }),
}));

vi.mock("@/hooks/usePurchase", () => ({
  usePurchaseItem: () => ({ mutate: vi.fn(), isPending: false }),
}));

// nuqs mock — minimal in-memory category state (mirrors journalListPage.test.tsx).
vi.mock("nuqs", () => ({
  parseAsString: { withDefault: (def: string) => def },
  useQueryState: (_key: string, defaultVal: string) => {
    const val = typeof defaultVal === "string" ? defaultVal : "all";
    return [val, vi.fn()] as const;
  },
}));

import MarketplacePage from "@/pages/student/marketplace/MarketplacePage";

const renderPage = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <MarketplacePage />
      </MemoryRouter>
    </I18nextProvider>
  );

const noItemsTitle = i18n.t("common:empty.noMarketplaceItems.title");

beforeEach(() => {
  resetState();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Marketplace empty-state fallback (R12.2, R12.6, R12.8)", () => {
  it("renders the shared NoMarketplaceItems empty state on zero data", () => {
    state.itemsPages = {
      pages: [{ items: [], page: 1, total: 0, hasMore: false }],
    };
    renderPage();

    // Surface still mounts (heading visible) — seed-failure resilience.
    expect(screen.getByText("Marketplace")).toBeTruthy();
    // Shared EmptyState_Library component is rendered.
    expect(screen.getByText(noItemsTitle)).toBeTruthy();
  });

  it("still loads (no crash) when the query produced no data (seed-absent)", () => {
    // Simulates seed migrations not having run: the infinite query has no pages.
    state.itemsPages = undefined;
    renderPage();

    expect(screen.getByText("Marketplace")).toBeTruthy();
    expect(screen.getByText(noItemsTitle)).toBeTruthy();
  });
});
