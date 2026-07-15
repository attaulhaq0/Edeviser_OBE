// =============================================================================
// StudentFeesPage — student fee status + receipts (net-new screen)
// =============================================================================
// Built from the prototype design system (`@/design-system`): PageHeader +
// StatePanel + FeePaymentList. Surfaces the student's own `fee_payments`
// (`useStudentFees`) with receipt download (`useGenerateFeeReceipt`).
// =============================================================================

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PageHeader, StatePanel } from "@/design-system";
import FeePaymentList from "@/features/shared/fees/FeePaymentList";
import { useAuth } from "@/hooks/useAuth";
import { useGenerateFeeReceipt, useStudentFees } from "@/hooks/useFees";

const downloadFile = (url: string, name: string) => {
  const link = document.createElement("a");
  link.href = url;
  link.download = name || "receipt.pdf";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const StudentFeesPage = () => {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const { data: payments, isLoading, isError } = useStudentFees(user?.id);
  const receipt = useGenerateFeeReceipt();
  const downloadingId = receipt.isPending ? receipt.variables : undefined;

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

  return (
    <div className="space-y-6">
      <PageHeader title={t("fees.title", "Fees")} />

      {isLoading ? (
        <StatePanel variant="loading" />
      ) : isError || !payments ? (
        <StatePanel
          variant="error"
          message={t(
            "fees.error",
            "Could not load your fee records. Please try again."
          )}
        />
      ) : (
        <FeePaymentList
          payments={payments}
          onDownloadReceipt={handleDownload}
          downloadingId={downloadingId}
        />
      )}
    </div>
  );
};

export default StudentFeesPage;
