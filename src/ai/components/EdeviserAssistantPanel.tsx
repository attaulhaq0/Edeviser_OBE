// =============================================================================
// EdeviserAssistantPanel — shared assistant shell (frontend-plan.md, tasks 3.1)
// =============================================================================
// Feature: Page-Capability Matrix consumption (Wave D2).
//
// Fail-closed contract (mirrors resolvePageCapabilities()):
//   1. No capability row for the current route             → renders NOTHING.
//   2. Row present, but no permitted surface is hosted     → renders NOTHING.
//   3. Hosts supplied for surfaces the row does not permit → silently dropped.
//
// DISPLAY/HINT ONLY — never an authorization boundary. Role/context/scope
// enforcement stays server-side (tool handlers + RLS). Approval-ceiling badges
// re-express the backend autonomy engine's strict-minimum posture;
// they are informational and grant nothing.

import { Sparkles } from "lucide-react";
import type { ComponentType } from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { PCard, SectionHeader } from "@/design-system";
import { usePageCapabilities } from "@/ai/hooks/usePageCapabilities";
import type {
  AssistantSurface,
  PageCapabilityRow,
} from "@/ai/capabilities/types";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Props injected into every hosted surface; lets cards read the active row. */
export interface HostedSurfaceProps {
  readonly row: PageCapabilityRow;
}

export interface EdeviserAssistantPanelProps {
  /**
   * Hosted surface components keyed by {@link AssistantSurface}. A surface
   * renders only when BOTH (a) the page-capability row permits it AND
   * (b) a host is supplied here. Everything else fails closed to invisible.
   */
  readonly surfaceHosts?: Partial<
    Record<AssistantSurface, ComponentType<HostedSurfaceProps>>
  >;
  readonly className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

const EdeviserAssistantPanel = ({
  surfaceHosts,
  className,
}: EdeviserAssistantPanelProps) => {
  const { t } = useTranslation("ai");
  const row = usePageCapabilities();

  // Only surfaces permitted by the row AND hosted by the caller survive.
  const hostedSurfaces = useMemo(
    () =>
      row?.surfaces.filter((surface) => Boolean(surfaceHosts?.[surface])) ?? [],
    [row, surfaceHosts]
  );

  if (!row || hostedSurfaces.length === 0) return null;

  return (
    <section
      aria-label={t("assistantPanel.title")}
      className={className}
      data-page-pattern={row.pathPattern}
      data-surfaces={hostedSurfaces.join(",")}
    >
      <PCard>
        <div className="p-5 pb-4">
          <SectionHeader
            icon={Sparkles}
            title={t("assistantPanel.title")}
            description={t("assistantPanel.subtitle")}
            action={
              <Badge variant="outline" className="text-xs font-bold">
                {t(`assistantPanel.approval.${row.approvalCeiling}`)}
              </Badge>
            }
          />
        </div>
        <div className="divide-y divide-slate-100 px-5 pb-5 pt-1">
          {hostedSurfaces.map((surface) => {
            const Host = surfaceHosts?.[surface];
            return Host ? <Host key={surface} row={row} /> : null;
          })}
        </div>
      </PCard>
    </section>
  );
};

export default EdeviserAssistantPanel;
