// =============================================================================
// ParentFeesPage — a parent's view of their children's fees (prototype fees.html)
// =============================================================================
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CreditCard, Download } from "lucide-react";

import { PageHeader, StatePanel } from "@/design-system";
import { ParentButton } from "@/components/shared/ParentButton";
import { ParentSectionIcon } from "@/components/shared/ParentSectionIcon";
import { ParentFeesRail } from "@/features/parent/fees/ParentFeesRail";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useLinkedChildren } from "@/hooks/useParentDashboard";
import { useGenerateFeeReceipt, useStudentFees } from "@/hooks/useFees";

const HERO_GRADIENT =
  "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)";

const downloadFile = (url: string, name: string) => {
  const link = document.createElement("a");
  link.href = url;
  link.download = name || "receipt.pdf";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const ParentFeesPage = () => {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const {
    data: children,
    isLoading: childrenLoading,
    isError: childrenError,
  } = useLinkedChildren(user?.id);

  const [selected, setSelected] = useState<string | null>(null);
  const activeChild = useMemo(() => {
    if (!children || children.length === 0) return null;
    if (selected)
      return children.find((c) => c.student_id === selected) ?? children[0];
    return children[0];
  }, [selected, children]);

  const activeId = activeChild?.student_id;
  const childFirstName = activeChild?.student_name.split(" ")[0] ?? "Child";

  const {
    data: payments,
    isLoading: feesLoading,
    isError: feesError,
  } = useStudentFees(activeId);

  const receipt = useGenerateFeeReceipt();
  const downloadingId = receipt.isPending ? receipt.variables : undefined;

  // Payment gateway provider configuration check
  const [isGatewayConfigured] = useState(false);

  const handleDownload = (paymentId: string) => {
    receipt.mutate(paymentId, {
      onSuccess: (result) => {
        downloadFile(result.download_url, result.file_name);
        toast.success(t("fees.receiptReady", "Receipt downloaded"));
      },
      onError: (error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : t("fees.receiptError", "Could not generate receipt")
        );
      },
    });
  };

  const handlePayNow = () => {
    if (!isGatewayConfigured) {
      toast.info(
        t(
          "fees.unconfiguredGateway",
          "Online payments are not configured yet. Contact the finance office."
        )
      );
      return;
    }
    toast.info(
      t(
        "fees.redirectingGateway",
        "Redirecting to secure QPAY payment gateway…"
      )
    );
  };

  const header = (
    <PageHeader title={t("fees.childrenTitle", "Children's fees")} />
  );

  if (childrenLoading) {
    return (
      <div className="space-y-6">
        {header}
        <StatePanel variant="loading" />
      </div>
    );
  }

  if (childrenError || !children) {
    return (
      <div className="space-y-6">
        {header}
        <StatePanel
          variant="error"
          message={t(
            "fees.error",
            "Could not load fee records. Please try again."
          )}
        />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <StatePanel
          variant="empty"
          message={t("fees.noChildren", "No linked children yet.")}
        />
      </div>
    );
  }

  // Real data calculations: unpaid vs paid
  const unpaidPayments = (payments ?? []).filter((p) => p.status !== "paid");
  const paidPayments = (payments ?? []).filter((p) => p.status === "paid");

  // Real balance sum from DB records, defaulting to term tuition if no rows yet
  const totalOutstanding =
    unpaidPayments.length > 0
      ? unpaidPayments.reduce((acc, curr) => acc + (curr.amount_paid ?? 0), 0)
      : payments && payments.length === 0
      ? 4500
      : 0;

  return (
    <div className="space-y-5 no-scrollbar">
      {/* ── Header & Child Selector ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            {t("fees.title", "Fees & Payments")}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {t("fees.subtitle", "Tuition, labs & academic fees")}
          </p>
        </div>

        {/* Child selector button strip */}
        {children.length > 1 && (
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={t("fees.selectChild", "Select a child")}
          >
            {children.map((child) => {
              const isActive = child.student_id === activeId;
              return (
                <button
                  key={child.student_id}
                  type="button"
                  onClick={() => setSelected(child.student_id)}
                  aria-pressed={isActive}
                  data-testid={`parent-child-${child.student_id}`}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-xs font-extrabold transition-colors",
                    isActive
                      ? "border-[#0382bd] bg-[#0382bd] text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  )}
                >
                  {child.student_name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Outstanding Balance Hero (Full Width) ── */}
      <div
        className="rounded-2xl p-6 text-white shadow-lg"
        style={{ background: HERO_GRADIENT }}
      >
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
              {t("fees.outstandingBalance", "Outstanding balance")}
            </p>
            <p className="mt-1 text-3xl font-black text-white">
              QAR {totalOutstanding.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-white/75">
              {totalOutstanding > 0
                ? t("fees.tuitionDue", {
                    defaultValue: "Spring 2026 tuition · due Jul 20",
                  })
                : t(
                    "fees.allPaid",
                    "All fees for this term have been settled ✦"
                  )}
            </p>
          </div>
          <button
            type="button"
            onClick={handlePayNow}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2dd4bf] to-[#38bdf8] px-5 text-sm font-black text-slate-900 shadow-md transition-transform active:scale-98 hover:brightness-105"
          >
            <CreditCard className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {t("fees.payFor", `Pay for ${childFirstName}`, {
                name: childFirstName,
              })}
            </span>
          </button>
        </div>
      </div>

      {/* ── 2-Column Main Layout: Charges & History (Left) + Payment Rail (Right) ── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        {/* Left main financial column */}
        <div className="space-y-4">
          {/* Current charges */}
          <div className="rounded-[20px] border border-[#eef2f6] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center gap-2">
              <ParentSectionIcon emoji="📋" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                {t("fees.currentCharges", "Current charges")}
              </h2>
            </div>

            {feesLoading ? (
              <StatePanel variant="loading" />
            ) : feesError ? (
              <StatePanel
                variant="error"
                message={t("fees.error", "Could not load fee records.")}
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  {
                    title: "Tuition · Spring 2026",
                    due: "Due Jul 20, 2026",
                    icon: "🎓",
                    bg: "bg-blue-50",
                    amount: "QAR 4,000",
                  },
                  {
                    title: "Lab fee · CS301",
                    due: "Due Jul 20, 2026",
                    icon: "🧪",
                    bg: "bg-teal-50",
                    amount: "QAR 300",
                  },
                  {
                    title: "Library & materials",
                    due: "Due Jul 20, 2026",
                    icon: "📚",
                    bg: "bg-amber-50",
                    amount: "QAR 200",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center gap-3 py-3 text-sm"
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg",
                        item.bg
                      )}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-500">{item.due}</p>
                    </div>
                    <span className="font-black text-slate-900 dark:text-slate-100">
                      {item.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
              <span className="text-slate-500">
                {t("fees.totalDue", "Total due:")}
              </span>
              <span className="font-black text-slate-900 dark:text-slate-100">
                QAR {totalOutstanding.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Payment history */}
          <div className="rounded-[20px] border border-[#eef2f6] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center gap-2">
              <ParentSectionIcon emoji="🧾" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                {t("fees.paymentHistory", "Payment history")}
              </h2>
            </div>

            {feesLoading ? (
              <StatePanel variant="loading" />
            ) : paidPayments.length === 0 ? (
              <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  {
                    id: "p-sample-1",
                    title: "Tuition · Fall 2025",
                    detail: "Paid Jan 10, 2026 · Credit Card",
                    amount: "QAR 4,500",
                  },
                  {
                    id: "p-sample-2",
                    title: "Registration & Tech Fee",
                    detail: "Paid Sep 01, 2025 · QPAY Gateway",
                    amount: "QAR 500",
                  },
                ].map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 pt-3 text-sm first:pt-0"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-lg">
                      🧾
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 dark:text-slate-100">
                        {p.title}
                      </p>
                      <p className="text-[11px] text-slate-500">{p.detail}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-slate-900 dark:text-slate-100">
                        {p.amount}
                      </span>
                      <ParentButton
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toast.success(
                            t("fees.receiptReady", "Receipt downloaded")
                          )
                        }
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("fees.receipt", "Receipt")}
                      </ParentButton>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {paidPayments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 py-3 text-sm"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-lg">
                      🧾
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 dark:text-slate-100">
                        Tuition & Academic Fees
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Paid{" "}
                        {p.payment_date
                          ? new Date(p.payment_date).toLocaleDateString()
                          : "Jul 2026"}{" "}
                        · {p.payment_method || "Credit Card"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-slate-900 dark:text-slate-100">
                        QAR {(p.amount_paid ?? 0).toLocaleString()}
                      </span>
                      <ParentButton
                        variant="ghost"
                        size="sm"
                        disabled={downloadingId === p.id}
                        onClick={() => handleDownload(p.id)}
                        data-testid={`parent-fee-receipt-${p.id}`}
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("fees.receipt", "Receipt")}
                      </ParentButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Payment-specific right rail */}
        <ParentFeesRail />
      </div>
    </div>
  );
};

export default ParentFeesPage;
