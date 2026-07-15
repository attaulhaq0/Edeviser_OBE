// =============================================================================
// ParentFeesPage — a parent's view of their children's fees (net-new screen)
// =============================================================================
// Built from the prototype design system (`@/design-system`): PageHeader +
// StatePanel + FeePaymentList. Pick a linked child; see their fee status +
// receipts. Reuses `useLinkedChildren` + `useStudentFees` + `useGenerateFeeReceipt`.
// =============================================================================

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PageHeader, StatePanel } from "@/design-system";
import FeePaymentList from "@/features/shared/fees/FeePaymentList";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useLinkedChildren } from "@/hooks/useParentDashboard";
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

const ParentFeesPage = () => {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const {
    data: children,
    isLoading: childrenLoading,
    isError: childrenError,
  } = useLinkedChildren(user?.id);

  const [selected, setSelected] = useState<string | null>(null);
  const activeId = selected ?? children?.[0]?.student_id;

  const {
    data: payments,
    isLoading: feesLoading,
    isError: feesError,
  } = useStudentFees(activeId);

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

  const header = <PageHeader title={t("fees.childrenTitle", "Children's fees")} />;

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
          message={t("fees.error", "Could not load fee records. Please try again.")}
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

  return (
    <div className="space-y-6">
      {header}

      {/* Child selector */}
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
                "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-slate-50"
              )}
            >
              {child.student_name}
            </button>
          );
        })}
      </div>

      {/* Selected child's fees */}
      {feesLoading ? (
        <StatePanel variant="loading" />
      ) : feesError || !payments ? (
        <StatePanel
          variant="error"
          message={t("fees.error", "Could not load fee records. Please try again.")}
        />
      ) : (
        <FeePaymentList
          payments={payments}
          onDownloadReceipt={handleDownload}
          downloadingId={downloadingId}
          receiptTestIdPrefix="parent-fee-receipt"
        />
      )}
    </div>
  );
};

export default ParentFeesPage;
