// =============================================================================
// PLODrillDownDialog — read-only drill-down for an Admin PLO heatmap cell
// Feature: qa-partner-review-remediation — Req 7.3
// -----------------------------------------------------------------------------
// Opened when an administrator selects a PLO cell in the heatmap. Lists the
// contributing CLOs/courses that roll up into the selected PLO, each with its
// own attainment value rendered using the platform attainment-level color coding.
// =============================================================================

import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { InlineEmpty } from "@/components/shared/EmptyState";
import {
  getAttainmentBadgeStyle,
  classifyAttainment,
} from "@/lib/attainmentClassifier";
import { Target } from "lucide-react";
import {
  PLO_ATTAINMENT_UNMEASURED,
  type AdminPLOHeatmapRow,
} from "@/hooks/useAdminPLOHeatmap";

interface PLODrillDownDialogProps {
  plo: AdminPLOHeatmapRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatPercent = (percent: number): string =>
  percent === PLO_ATTAINMENT_UNMEASURED ? "—" : `${Math.round(percent)}%`;

const PLODrillDownDialog = ({
  plo,
  open,
  onOpenChange,
}: PLODrillDownDialogProps) => {
  const { t } = useTranslation("admin");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            {plo?.plo_title ?? t("dashboard.ploDrillDown.title")}
          </DialogTitle>
          <DialogDescription>
            {plo
              ? t("dashboard.ploDrillDown.subtitle", {
                  value: formatPercent(plo.attainment_percent),
                  method: t(`dashboard.ploDrillDown.method.${plo.derivation}`),
                })
              : t("dashboard.ploDrillDown.title")}
          </DialogDescription>
        </DialogHeader>

        {!plo || plo.contributors.length === 0 ? (
          <InlineEmpty
            icon={<Target className="h-6 w-6 text-gray-400" />}
            title={t("dashboard.ploDrillDown.emptyTitle")}
            description={t("dashboard.ploDrillDown.emptyDescription")}
          />
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="p-2 text-start font-bold text-xs uppercase tracking-wide text-gray-500">
                    {t("dashboard.ploDrillDown.cloColumn")}
                  </th>
                  <th className="p-2 text-start font-bold text-xs uppercase tracking-wide text-gray-500">
                    {t("dashboard.ploDrillDown.courseColumn")}
                  </th>
                  <th className="p-2 text-end font-bold text-xs uppercase tracking-wide text-gray-500">
                    {t("dashboard.ploDrillDown.attainmentColumn")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {plo.contributors.map((contributor) => (
                  <tr
                    key={contributor.clo_id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="p-2 font-medium text-gray-700">
                      {contributor.clo_title}
                    </td>
                    <td className="p-2 text-gray-500">
                      {contributor.course_name ?? "—"}
                    </td>
                    <td className="p-2 text-end">
                      <Badge
                        variant="outline"
                        className={getAttainmentBadgeStyle(
                          contributor.attainment_percent
                        )}
                      >
                        {Math.round(contributor.attainment_percent)}% ·{" "}
                        {t(
                          `dashboard.ploDrillDown.level.${classifyAttainment(
                            contributor.attainment_percent
                          )}`
                        )}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PLODrillDownDialog;
