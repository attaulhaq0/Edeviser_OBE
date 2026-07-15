// AdminSecurityPage — functional render tests (net-new screen, P3.6).
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AdminSecurityData } from "@/hooks/useAdminSecurity";
import AdminSecurityPage from "@/features/admin/security/AdminSecurityPage";

const hoisted = vi.hoisted(() => ({
  q: {
    data: undefined as AdminSecurityData | undefined,
    isLoading: false,
    isError: false,
  },
}));

vi.mock("@/hooks/useAdminSecurity", () => ({
  useAdminSecurity: () => hoisted.q,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_key: string, def?: string) => def ?? _key }),
}));

const future = new Date(Date.now() + 3_600_000).toISOString();
const sampleData: AdminSecurityData = {
  blockedIps: [
    {
      ip_address: "203.0.113.5",
      blocked_until: future,
      reason: "Too many failed logins",
      blocked_by: null,
      created_at: new Date().toISOString(),
    },
  ],
  lockedAccounts: [
    {
      email: "locked.user@example.com",
      attempt_count: 5,
      locked_until: future,
      updated_at: new Date().toISOString(),
    },
  ],
  rateLimitEvents: [
    {
      id: 1,
      ip_address: "203.0.113.9",
      event_type: "login_rate_limited",
      user_id: null,
      metadata: {},
      occurred_at: new Date().toISOString(),
    },
  ],
};

beforeEach(() => {
  hoisted.q.data = undefined;
  hoisted.q.isLoading = false;
  hoisted.q.isError = false;
});

describe("AdminSecurityPage", () => {
  it("renders the title while loading (no crash)", () => {
    hoisted.q.isLoading = true;
    render(<AdminSecurityPage />);
    expect(screen.getByText("Security")).toBeInTheDocument();
  });

  it("shows an error state", () => {
    hoisted.q.isError = true;
    render(<AdminSecurityPage />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load security data. Please try again."
    );
  });

  it("renders blocked IPs, lockouts, and events from data", () => {
    hoisted.q.data = sampleData;
    render(<AdminSecurityPage />);
    expect(screen.getByText("203.0.113.5")).toBeInTheDocument();
    expect(screen.getByText("locked.user@example.com")).toBeInTheDocument();
    expect(screen.getByText("login_rate_limited")).toBeInTheDocument();
    // KPI labels present
    expect(screen.getByText("Active IP blocks")).toBeInTheDocument();
    expect(screen.getByText("Locked accounts")).toBeInTheDocument();
  });

  it("renders per-section empty states when there is no data", () => {
    hoisted.q.data = {
      blockedIps: [],
      lockedAccounts: [],
      rateLimitEvents: [],
    };
    render(<AdminSecurityPage />);
    expect(screen.getByText("No blocked IPs.")).toBeInTheDocument();
    expect(screen.getByText("No login lockouts.")).toBeInTheDocument();
    expect(screen.getByText("No recent events.")).toBeInTheDocument();
  });
});
