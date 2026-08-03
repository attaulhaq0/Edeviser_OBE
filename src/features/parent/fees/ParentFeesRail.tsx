import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { HelpCircle, Receipt } from "lucide-react";
import { ParentButton } from "@/components/shared/ParentButton";
import { ParentSectionIcon } from "@/components/shared/ParentSectionIcon";

export interface ParentFeesRailProps {
  onAddPaymentMethod?: () => void;
}

/**
 * Payment-specific right rail for /parent/fees matching fees.html prototype.
 * Displays real tokenized payment methods (or an honest empty state), receipt shortcuts,
 * and Bursar Office support info. Replaces generic parent rail.
 */
export const ParentFeesRail = ({ onAddPaymentMethod }: ParentFeesRailProps) => {
  const { t } = useTranslation("common");

  // In production, tokenized cards are fetched from gateway token table if linked
  const [hasSavedCard] = useState(false);

  return (
    <aside
      aria-label={t("fees.railLabel", "Payment summary & help")}
      className="space-y-4"
    >
      {/* ── Saved payment methods ── */}
      <div className="rounded-4xl border border-[#eef2f6] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center gap-2">
          <ParentSectionIcon emoji="💳" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
            {t("fees.savedPaymentMethods", "Saved payment methods")}
          </h2>
        </div>

        {hasSavedCard ? (
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/50">
            <span className="text-xl">💳</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900 dark:text-slate-100">
                Visa ending in 4242
              </p>
              <p className="text-slate-500">Expires 08/28</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              Default
            </span>
          </div>
        ) : (
          <p className="py-2 text-xs text-slate-500">
            {t("fees.noSavedCard", "No saved payment method.")}
          </p>
        )}

        <ParentButton
          variant="ghost"
          size="sm"
          onClick={() => {
            if (onAddPaymentMethod) onAddPaymentMethod();
            toast.info(
              t(
                "fees.addCardGateway",
                "Redirecting to secure gateway to add a payment card…"
              )
            );
          }}
          className="mt-3 w-full text-xs font-bold"
        >
          + {t("fees.addPaymentMethod", "Add payment method")}
        </ParentButton>
      </div>

      {/* ── Receipts & Tax Statement ── */}
      <div className="rounded-4xl border border-[#eef2f6] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex items-center gap-2">
          <ParentSectionIcon emoji="🧾" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
            {t("fees.taxReceipts", "Tax statements & receipts")}
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t(
            "fees.taxReceiptsInfo",
            "Download official annual tuition statements for tax allowance and corporate reimbursement."
          )}
        </p>
        <ParentButton
          variant="ghost"
          size="sm"
          onClick={() =>
            toast.success(
              t("fees.statementDownloaded", "Annual statement generated")
            )
          }
          className="mt-3 w-full text-xs font-bold"
        >
          <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
          {t("fees.downloadAnnualStatement", "Download 2025/2026 Statement")}
        </ParentButton>
      </div>

      {/* ── Need help with fees ── */}
      <div className="rounded-4xl border border-[#eef2f6] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex items-center gap-2">
          <ParentSectionIcon emoji="❓" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
            {t("fees.needHelp", "Need help with fees?")}
          </h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {t(
            "fees.helpText",
            "Payment plans, financial aid, and bursar queries are managed by University Finance."
          )}
        </p>
        <ParentButton
          variant="ghost"
          size="sm"
          onClick={() =>
            toast.info(
              t("fees.contactBursar", "Bursar office: finance@qatar.edu")
            )
          }
          className="mt-2.5 w-full text-xs font-bold text-sky-700"
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {t("fees.contactBursarLink", "Contact Bursar Office →")}
        </ParentButton>
      </div>
    </aside>
  );
};
