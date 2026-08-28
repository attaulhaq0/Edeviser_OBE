// Feature: Task 3.1 — AgentAutonomyControl (Wave D3, 12-component set).
// Read-only autonomy status surface. Institution flags are administered
// server-side (institution_autonomy_settings is service-role-only); this
// component NEVER mutates them — it visualizes the resolved policy so users
// understand why an action needs approval or ran automatically.
// Protected actions are ALWAYS marked as requiring human approval regardless
// of any displayed flag state (spec guardrail #5).
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";

export interface AgentAutonomyControlProps {
  readonly configured: boolean;
  readonly institutionCeiling: string;
  readonly autoExecuteLowRisk: boolean;
  readonly rollbackEnabled: boolean;
  readonly effectiveAutonomy: string;
  readonly className?: string;
}

export default function AgentAutonomyControl({
  configured,
  institutionCeiling,
  autoExecuteLowRisk,
  rollbackEnabled,
  effectiveAutonomy,
  className,
}: AgentAutonomyControlProps) {
  const { t } = useTranslation("ai");

  return (
    <section
      className={className}
      aria-label={t("autonomy.title", "Assistant autonomy")}
      data-testid="agent-autonomy-control"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">
          {t("autonomy.title", "Assistant autonomy")}
        </h3>
        <Badge variant="outline" data-testid="autonomy-effective">
          {t("autonomy.effective", "Effective {{level}}", {
            level: effectiveAutonomy,
          })}
        </Badge>
        {!configured ? (
          <Badge variant="secondary">
            {t("autonomy.usingDefaults", "Institution defaults")}
          </Badge>
        ) : null}
      </div>
      <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between gap-2">
          <dt>{t("autonomy.institutionCeiling", "Institution ceiling")}</dt>
          <dd className="font-medium text-foreground">{institutionCeiling}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{t("autonomy.autoExecute", "Auto-run low-risk actions")}</dt>
          <dd className="font-medium" data-testid="autonomy-auto-exec">
            {autoExecuteLowRisk
              ? t("autonomy.on", "Enabled")
              : t("autonomy.off", "Requires confirmation")}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{t("autonomy.rollback", "Rollback controls")}</dt>
          <dd className="font-medium">
            {rollbackEnabled
              ? t("autonomy.rollbackOn", "Active")
              : t("autonomy.rollbackOff", "Disabled")}
          </dd>
        </div>
      </dl>
      <p
        className="mt-2 rounded-lg bg-slate-100/80 p-2 text-xs"
        data-testid="autonomy-protected-note"
      >
        {t(
          "autonomy.protectedNote",
          "Grades, official outcomes, mappings and messages always require a human approval — regardless of autonomy settings."
        )}
      </p>
    </section>
  );
}
