// =============================================================================
// TransactionHistoryPage — Unit tests (transaction failure refusal)
//
// Validates: Requirements 33.1a
//   When the source-level paginated query fails (isError), the page surfaces an
//   error panel and refuses to render any transactions — no truncated/partial
//   list is shown. The success path is covered as a sanity counterpart so the
//   "no rows" assertions in the error case are meaningful rather than vacuous.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";
import type {
  TransactionEntry,
  TransactionHistoryResult,
} from "@/hooks/useTransactionHistory";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "current-user" },
    profile: { role: "student", institution_id: "inst-1" },
    role: "student",
    institutionId: "inst-1",
  }),
}));

// XPBalanceBadge pulls its own data hooks; stub it out so the page test stays
// focused on the transaction list / error behavior.
vi.mock("@/components/shared/XPBalanceBadge", () => ({
  default: () => <div data-testid="xp-balance-badge">XPBalanceBadge</div>,
}));

// Record toast.error calls so we can assert the failure is surfaced (R33.1a).
const toastErrorMock = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({
  toast: { error: toastErrorMock },
}));

// Mutable hook result so each test can flip success / error / empty states.
type TransactionHistoryHookResult = {
  data: TransactionHistoryResult | undefined;
  isLoading: boolean;
  isError: boolean;
};

const transactionHookState = vi.hoisted(() => ({
  current: null as unknown as TransactionHistoryHookResult,
}));

vi.mock("@/hooks/useTransactionHistory", () => ({
  useTransactionHistory: () => transactionHookState.current,
}));

// nuqs mock — minimal in-memory state store (mirrors leaderboardPage.test.tsx).
vi.mock("nuqs", () => {
  const stateStore = new Map<string, string | number>();
  return {
    parseAsString: { withDefault: (def: string) => def },
    parseAsInteger: { withDefault: (def: number) => def },
    useQueryState: (key: string, defaultVal: string | number) => {
      const val = stateStore.get(key) ?? defaultVal;
      const setter = vi.fn((newVal: string | number) => {
        stateStore.set(key, newVal);
      });
      return [val, setter] as const;
    },
  };
});

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const sampleEntries: TransactionEntry[] = [
  {
    id: "earn-1",
    type: "earning",
    amount: 25,
    label: "Assignment Submission",
    category: "submission",
    date: "2026-05-30T10:00:00Z",
  },
  {
    id: "spend-1",
    type: "spending",
    amount: 200,
    label: "Streak Freeze",
    category: "power_up",
    date: "2026-05-29T09:00:00Z",
  },
];

const successResult: TransactionHistoryHookResult = {
  data: { entries: sampleEntries, totalCount: 2, hasMore: false },
  isLoading: false,
  isError: false,
};

const errorResult: TransactionHistoryHookResult = {
  data: undefined,
  isLoading: false,
  isError: true,
};

// ─── Harness ────────────────────────────────────────────────────────────────

import TransactionHistoryPage from "@/pages/student/marketplace/TransactionHistoryPage";

const renderPage = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <TransactionHistoryPage />
    </I18nextProvider>
  );

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("TransactionHistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionHookState.current = successResult;
  });

  it("renders transaction rows on the success path", () => {
    transactionHookState.current = successResult;
    renderPage();

    expect(screen.getByText("Assignment Submission")).toBeInTheDocument();
    expect(screen.getByText("Streak Freeze")).toBeInTheDocument();
  });

  it("shows an error panel and refuses to display transactions on query failure (R33.1a)", () => {
    transactionHookState.current = errorResult;
    renderPage();

    // An error panel is rendered (role=alert with the localized title/body).
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(
      screen.getByText("Couldn't load your transactions")
    ).toBeInTheDocument();

    // No transactions are shown — not even a truncated/partial list.
    expect(screen.queryByText("Assignment Submission")).not.toBeInTheDocument();
    expect(screen.queryByText("Streak Freeze")).not.toBeInTheDocument();

    // The empty-state copy is also not shown — failure is distinct from "no data".
    expect(
      screen.queryByText("No transactions found.")
    ).not.toBeInTheDocument();
  });

  it("surfaces the failure via a toast notification (R33.1a)", () => {
    transactionHookState.current = errorResult;
    renderPage();

    expect(toastErrorMock).toHaveBeenCalledWith(
      "Failed to load transaction history"
    );
  });

  it("does not toast on the success path", () => {
    transactionHookState.current = successResult;
    renderPage();

    expect(toastErrorMock).not.toHaveBeenCalled();
  });
});
