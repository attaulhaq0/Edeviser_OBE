// =============================================================================
// FeePaymentList — shared fee KPIs + payment history (student & parent)
// =============================================================================
// Built entirely from the prototype design system (`@/design-system`):
// KPICard + SectionCard + Button. Reused by StudentFeesPage and ParentFeesPage.
// =============================================================================

import { useTranslation } from "react-i18next";
import { Download, Loader2, Receipt, Wallet } from "lucide-react";

import { Button, KPICard, SectionCard } from "@/design-system";
import FeeStatusBadge from "@/components/shared/FeeStatusBadge";
import type { FeePayment } from "@/hooks/useFees";
import type { PaymentStatus } from "@/types/app";

const VALID_STATUS: readonly PaymentStatus[] = [
  "pending",
  "paid",
  "overdue",
  "waived",
];
const isPaymentStatus = (s: string): s is PaymentStatus =>
  (VALID_STATUS as readonly string[]).includes(s);

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();

export interface FeePaymentListProps {
  payments: FeePayment[];
  /** Invoked with the payment id when a paid row's receipt is requested. */
  onDownloadReceipt: (paymentId: string) => void;
  /** The payment id whose receipt is currently being generated (spinner). */
  downloadingId?: string;
  /** testid prefix for receipt buttons (default "fee-receipt"). */
  receiptTestIdPrefix?: string;
}

const FeePaymentList = ({
  payments,
  onDownloadReceipt,
  downloadingId,
  receiptTestIdPrefix = "fee-receipt",
}: FeePaymentListProps) => {
  const { t } = useTranslation("common");

  const paidCount = payments.filter((p) => p.status === "paid").length;
  const outstanding = payments.filter(
    (p) => p.status === "pending" || p.status === "overdue"
  ).length;
  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount_paid, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <KPICard
          icon={Receipt}
          label={t("fees.paid", "Paid")}
          value={paidCount}
          iconBgClass="bg-green-50"
          iconColorClass="text-green-600"
        />
        <KPICard
          icon={Wallet}
          label={t("fees.outstanding", "Outstanding")}
          value={outstanding}
          iconBgClass="bg-amber-50"
          iconColorClass="text-amber-600"
          valueClassName={outstanding > 0 ? "text-amber-600" : "text-sky-700"}
        />
        <KPICard
          icon={Receipt}
          label={t("fees.totalPaid", "Total paid")}
          value={totalPaid.toLocaleString()}
        />
      </div>

      <SectionCard icon={Wallet} title={t("fees.history", "Payment history")}>
        {payments.length === 0 ? (
          <p className="py-3 text-sm text-gray-500">
            {t("fees.empty", "No fee records yet.")}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {payments.map((payment) => {
              const canDownload =
                payment.status === "paid" && Boolean(payment.receipt_number);
              const isDownloading = downloadingId === payment.id;
              return (
                <li
                  key={payment.id}
                  className="flex flex-wrap items-center gap-3 py-3"
                >
                  {isPaymentStatus(payment.status) ? (
                    <FeeStatusBadge status={payment.status} />
                  ) : (
                    <span className="text-xs font-semibold text-gray-500">
                      {payment.status}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900">
                      {payment.amount_paid.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {fmtDate(payment.payment_date)}
                      {payment.receipt_number
                        ? ` · #${payment.receipt_number}`
                        : ""}
                    </p>
                  </div>
                  {canDownload && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => onDownloadReceipt(payment.id)}
                      disabled={isDownloading}
                      className="shrink-0"
                      data-testid={`${receiptTestIdPrefix}-${payment.id}`}
                    >
                      {isDownloading ? (
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Download className="h-4 w-4" aria-hidden="true" />
                      )}
                      {t("fees.receipt", "Receipt")}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
};

export default FeePaymentList;
