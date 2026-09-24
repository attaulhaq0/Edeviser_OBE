// Canonical metric presentation is not an academic classifier or data formatter.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { Wallet } from "lucide-react";
import { readFileSync } from "node:fs";
import { URL as NodeURL } from "node:url";
import ts from "typescript";
import { KPICard, type KPICardProps } from "@/design-system/patterns";
import FeePaymentList from "@/features/shared/fees/FeePaymentList";
import AdminSecurityPage from "@/features/admin/security/AdminSecurityPage";
import type { AdminSecurityData } from "@/hooks/useAdminSecurity";
import type { FeePayment } from "@/hooks/useFees";
import en from "@/locales/en/common.json";
import ar from "@/locales/ar/common.json";

const security = vi.hoisted(() => ({ data: { blockedIps: [], lockedAccounts: [], rateLimitEvents: [] } as AdminSecurityData }));
vi.mock("@/hooks/useAdminSecurity", () => ({ useAdminSecurity: () => ({ data: security.data, isLoading: false, isError: false }) }));
const i18n = createInstance();
beforeEach(async () => {
  if (!i18n.isInitialized) await i18n.use(initReactI18next).init({
    lng: "en", fallbackLng: "en", defaultNS: "common",
    resources: { en: { common: en }, ar: { common: ar } },
    interpolation: { escapeValue: false },
  });
  await i18n.changeLanguage("en");
  security.data = { blockedIps: [], lockedAccounts: [], rateLimitEvents: [] };
});
const wrap = (children: React.ReactNode) => <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
const cardFor = (label: string) => screen.getByText(label, { selector: "dt" }).closest("[data-kpi-tone]")!;

const callers = [
  "features/teacher/dashboard/TeacherDashboardScreen.tsx",
  "features/admin/dashboard/AdminDashboardScreen.tsx",
  "features/admin/security/AdminSecurityPage.tsx",
  "features/shared/fees/FeePaymentList.tsx",
  "pages/coordinator/gap-analysis/GapAnalysisView.tsx",
  "pages/student/progress/XPHistoryNew.tsx",
  "pages/student/portfolio/StudentPortfolioNew.tsx",
  "pages/admin/marketplace/MarketplaceAnalyticsPage.tsx",
  "components/shared/AdminDashboardNew.tsx",
  "components/shared/TeacherDashboardNew.tsx",
  "components/shared/StudentDashboardNew.tsx",
  "components/shared/ParentDashboardNew.tsx",
  "components/shared/CoordinatorDashboardNew.tsx",
];
const kpiUses = (path: string) => {
  const source = readFileSync(new NodeURL(`../../${path}`, import.meta.url), "utf8");
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const cards: Record<string, string>[] = [];
  const visit = (node: ts.Node): void => {
    if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(file) === "KPICard") {
      const props: Record<string, string> = {};
      for (const prop of node.attributes.properties) {
        expect(ts.isJsxAttribute(prop), "Canonical callers must not hide paint in a spread").toBe(true);
        if (ts.isJsxAttribute(prop)) props[prop.name.getText(file)] = prop.initializer?.getText(file) ?? "";
      }
      cards.push(props);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return cards;
};

describe("canonical KPI value and tone contract", () => {
  it.each([0, -4.25, 85, "85%", "٣٫٥ / ٨", "1,200.50 QAR", "A−", "  Native scale  "])("preserves native value %s without thresholds or formatting", (value) => {
    const { container } = render(wrap(<KPICard icon={Wallet} label="Metric" value={value} />));
    expect(container.querySelector("dd")?.textContent).toBe(String(value));
    expect(cardFor("Metric")).toHaveAttribute("data-kpi-tone", "neutral");
    expect(cardFor("Metric")).toHaveAttribute("data-kpi-value-state", "available");
  });

  it.each([Number.NaN, Infinity, -Infinity, "", " \n\t ", null, undefined])("renders malformed runtime value %s as neutral unavailable", (value) => {
    const props = { icon: Wallet, label: "Metric", value, tone: "success" } as KPICardProps;
    render(wrap(<KPICard {...props} />));
    expect(screen.getByText(en.metric.unavailable)).toHaveClass("text-card-foreground");
    expect(cardFor("Metric")).toHaveAttribute("data-kpi-tone", "neutral");
    expect(cardFor("Metric")).toHaveAttribute("data-kpi-value-state", "unavailable");
    expect(screen.queryByText("NaN")).not.toBeInTheDocument();
  });

  it.each(["neutral", "success", "warning", "danger", "info"] as const)("only explicit %s chooses tone, even for measured zero", (tone) => {
    render(wrap(<KPICard icon={Wallet} label="Metric" value={0} tone={tone} />));
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(cardFor("Metric")).toHaveAttribute("data-kpi-tone", tone);
  });

  it.each(["text-red-600", "toString", "__proto__"])("rejects runtime tone escape %s", (tone) => {
    render(wrap(<KPICard {...({ icon: Wallet, label: "Metric", value: 8, tone } as KPICardProps)} />));
    expect(cardFor("Metric")).toHaveAttribute("data-kpi-tone", "neutral");
    expect(screen.getByText("8")).toHaveClass("text-card-foreground");
  });

  it("honors explicit unavailable independently of value and updates language in place", async () => {
    const { rerender } = render(wrap(<KPICard icon={Wallet} label="Metric" value={0} valueState="unavailable" tone="success" />));
    expect(screen.getByText(en.metric.unavailable)).toBeInTheDocument();
    await act(async () => { await i18n.changeLanguage("ar"); });
    expect(screen.getByText(ar.metric.unavailable)).toBeInTheDocument();
    expect(cardFor("Metric")).toHaveAttribute("data-kpi-tone", "neutral");
    rerender(wrap(<KPICard icon={Wallet} label="Metric" value={0} />));
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.queryByText(ar.metric.unavailable)).not.toBeInTheDocument();
  });

  it("does not forward legacy runtime paint, className or arbitrary element props", () => {
    const props = { icon: Wallet, label: "Metric", value: 1, className: "text-red-600", iconBgClass: "bg-blue-500", valueClassName: "text-green-600", iconColorClass: "text-amber-500", onClick: vi.fn() };
    const { container } = render(wrap(<KPICard {...props} />));
    expect(container.innerHTML).not.toMatch(/text-red-600|bg-blue-500|text-green-600|text-amber-500/);
    fireEvent.click(cardFor("Metric"));
    expect(props.onClick).not.toHaveBeenCalled();
  });

  it("keeps finite API props compile-checked rather than retaining escape hatches", () => {
    const rejected = [
      // @ts-expect-error paint is not part of the canonical metric contract
      <KPICard icon={Wallet} label="Metric" value={0} iconBgClass="bg-blue-500" />,
      // @ts-expect-error paint is not part of the canonical metric contract
      <KPICard icon={Wallet} label="Metric" value={0} iconColorClass="text-red-600" />,
      // @ts-expect-error paint is not part of the canonical metric contract
      <KPICard icon={Wallet} label="Metric" value={0} valueClassName="text-red-600" />,
      // @ts-expect-error nested surface uses the finite inset choice
      <KPICard icon={Wallet} label="Metric" value={0} className="shadow-none" />,
      // @ts-expect-error no arbitrary tones
      <KPICard icon={Wallet} label="Metric" value={0} tone="excellent" />,
      // @ts-expect-error no invented data-status state
      <KPICard icon={Wallet} label="Metric" value={0} valueState="failing" />,
    ];
    expect(rejected).toHaveLength(6);
  });
});

describe("caller-owned facts, values and migration boundaries", () => {
  it("all thirteen canonical caller modules use the finite contract", () => {
    const cards = callers.flatMap(kpiUses);
    expect(cards).toHaveLength(48);
    for (const props of cards) {
      expect(Object.keys(props).every(key => ["icon", "label", "value", "tone", "valueState", "surface"].includes(key))).toBe(true);
      expect(props.value).toBeTruthy();
      expect(props.value).not.toContain("attainmentValueClass");
    }
    expect(kpiUses(callers[4]!).every(props => props.surface === '"inset"' && !props.tone)).toBe(true);
    expect(kpiUses(callers[5]!).every(props => !props.tone)).toBe(true);
    expect(kpiUses(callers[6]!).every(props => !props.tone)).toBe(true);
  });

  it("preserves only the existing explicit risk/security/outstanding conditions", () => {
    const conditions = callers.flatMap(kpiUses).flatMap(props => props.tone ? [props.tone] : []);
    expect(conditions.sort()).toEqual([
      '{atRiskCount > 0 ? "danger" : "neutral"}',
      '{activeBlocks > 0 ? "danger" : "neutral"}',
      '{lockedCount > 0 ? "warning" : "neutral"}',
      '{outstanding > 0 ? "warning" : "neutral"}',
      '{atRisk > 0 ? "danger" : "neutral"}',
      '{belowTargetCount > 0 ? "danger" : "neutral"}',
    ].sort());
  });

  it("real fee list keeps native totals, zero and receipt behavior while outstanding uses its existing condition", () => {
    const receipt = vi.fn();
    const payment: FeePayment = { id: "paid-1", fee_structure_id: "fee-1", student_id: "student-1", amount_paid: 1250.5, payment_method: "card", receipt_number: "receipt-1", status: "paid", payment_date: "2026-01-01", created_at: "2026-01-01T00:00:00Z" };
    const { rerender } = render(wrap(<FeePaymentList payments={[payment]} onDownloadReceipt={receipt} />));
    expect(within(cardFor("Total paid") as HTMLElement).getByText((1250.5).toLocaleString())).toBeInTheDocument();
    expect(cardFor("Paid")).toHaveAttribute("data-kpi-tone", "neutral");
    expect(cardFor("Outstanding")).toHaveAttribute("data-kpi-tone", "neutral");
    expect(within(cardFor("Outstanding") as HTMLElement).getByText("0")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("fee-receipt-paid-1"));
    expect(receipt).toHaveBeenCalledExactlyOnceWith("paid-1");
    rerender(wrap(<FeePaymentList payments={[payment, { ...payment, id: "pending-1", status: "overdue", amount_paid: 0, receipt_number: null }]} onDownloadReceipt={receipt} />));
    expect(cardFor("Outstanding")).toHaveAttribute("data-kpi-tone", "warning");
    expect(within(cardFor("Outstanding") as HTMLElement).getByText("1")).toBeInTheDocument();
  });

  it("real security metrics render measured zero neutrally and preserve authoritative active conditions", () => {
    const { rerender } = render(wrap(<AdminSecurityPage />));
    expect(cardFor("Active IP blocks")).toHaveAttribute("data-kpi-tone", "neutral");
    expect(cardFor("Locked accounts")).toHaveAttribute("data-kpi-tone", "neutral");
    security.data = {
      blockedIps: [{ ip_address: "203.0.113.1", blocked_until: "2099-01-01T00:00:00Z", reason: "Fixture", blocked_by: null, created_at: "2026-01-01T00:00:00Z" }],
      lockedAccounts: [{ email: "fixture@example.invalid", attempt_count: 5, locked_until: "2099-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" }], rateLimitEvents: [],
    };
    rerender(wrap(<AdminSecurityPage />));
    expect(cardFor("Active IP blocks")).toHaveAttribute("data-kpi-tone", "danger");
    expect(cardFor("Locked accounts")).toHaveAttribute("data-kpi-tone", "warning");
    expect(cardFor("Recent events")).toHaveAttribute("data-kpi-tone", "neutral");
  });
});
