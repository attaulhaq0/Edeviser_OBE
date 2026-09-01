// Feature: Task 7.2 + 6.3 (edeviser-agentic-intelligence) — institution
// autonomy posture card. Surfaces the LIVE institution_autonomy_settings row
// (RLS-verified: admin-readable via client) or the fail-closed default posture
// when unconfigured. Display-only: policy changes remain a DB/admin operation.
// Self-contained i18n namespace (autonomyControl.*) so keys cannot drift.

import { useTranslation } from "react-i18next";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { useInstitutionAutonomy } from "@/ai/hooks/useInstitutionAutonomy";

const CEILING_VALUES = ["A0", "A1", "A2", "A3"] as const;
const autonomyRowSchema = z.object({
  // Field name mirrors the LIVE institution_autonomy_settings column and the
  // shape useInstitutionAutonomy returns — a mismatch here would make every
  // real settings row fail safeParse and silently fall back to the default
  // posture (found in Wave D review).
  operational_autonomy_ceiling: z.enum(CEILING_VALUES),
  auto_execute_low_risk: z.boolean(),
  rollback_enabled: z.boolean(),
  evaluation_thresholds: z.unknown().optional(),
  updated_at: z.string().optional(),
});

export interface AgentAutonomyControlProps {
  readonly className?: string;
}

const FlagPill = ({
  label,
  on,
}: {
  readonly label: string;
  readonly on: boolean;
}) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
      on ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
    )}
  >
    {label}
  </span>
);

/**
 * Admin-facing institution autonomy posture. Data comes from the
 * institution_autonomy_settings row scoped by RLS to the caller's
 * institution; a missing row renders the fail-closed default posture
 * (A2 ceiling, auto-execute off, rollback on) — matching the DB defaults
 * the server-side policy engine assumes when unconfigured.
 */
const AgentAutonomyControl = ({ className }: AgentAutonomyControlProps) => {
  const { t } = useTranslation("ai");
  const { data, isLoading, isError } = useInstitutionAutonomy();

  const parsed = data ? autonomyRowSchema.safeParse(data) : null;
  const settings = parsed?.success ? parsed.data : null;

  return (
    <section
      className={cn(
        "rounded-xl border border-slate-200/60 bg-white/80 p-4 backdrop-blur-xs",
        className
      )}
      aria-labelledby="agent-autonomy-control-title"
    >
      <header className="flex items-center gap-2">
        {isError ? (
          <ShieldAlert
            className="h-4 w-4 shrink-0 text-amber-600"
            aria-hidden="true"
          />
        ) : (
          <ShieldCheck
            className="h-4 w-4 shrink-0 text-sky-600"
            aria-hidden="true"
          />
        )}
        <h3
          id="agent-autonomy-control-title"
          className="text-sm font-semibold text-slate-900"
        >
          {t("autonomyControl.title")}
        </h3>
      </header>
      <p className="mt-1 text-xs text-slate-600">
        {t("autonomyControl.description")}
      </p>

      {isLoading ? (
        <div
          className="mt-3 h-16 motion-safe:animate-pulse rounded-lg bg-slate-100"
          aria-hidden="true"
        />
      ) : isError ? (
        <p className="mt-3 text-xs text-slate-500">
          {t("autonomyControl.unavailable")}
        </p>
      ) : (
        <dl className="mt-3 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-slate-600">{t("autonomyControl.ceiling")}</dt>
            <dd>
              <span className="rounded-md bg-sky-50 px-2 py-1 font-bold text-sky-700">
                {settings?.operational_autonomy_ceiling ?? "A2"}
              </span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-slate-600">
              {t("autonomyControl.autoExecute")}
            </dt>
            <dd>
              <FlagPill
                label={
                  settings?.auto_execute_low_risk
                    ? t("autonomyControl.enabled")
                    : t("autonomyControl.disabled")
                }
                on={settings?.auto_execute_low_risk ?? false}
              />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-slate-600">{t("autonomyControl.rollback")}</dt>
            <dd>
              <FlagPill
                label={
                  settings?.rollback_enabled
                    ? t("autonomyControl.enabled")
                    : t("autonomyControl.disabled")
                }
                on={settings?.rollback_enabled ?? true}
              />
            </dd>
          </div>
          {!settings && (
            <p className="pt-1 text-[11px] italic text-slate-500">
              {t("autonomyControl.defaultPosture")}
            </p>
          )}
        </dl>
      )}
    </section>
  );
};

export default AgentAutonomyControl;
