// Feature: Task 7.2 + 6.3 (edeviser-agentic-intelligence) — institution
// autonomy posture card. Surfaces the LIVE institution autonomy posture (via
// the orchestrator's bounded get_institution_autonomy channel) or the
// fail-closed default posture when unconfigured.
//
// ADMIN-INTERACTIVE: admins update the row DIRECTLY under the
// institution_autonomy_settings_admin_write RLS policy (active admin of the
// same institution). The orchestrator re-reads settings on every run, so a
// saved change takes effect immediately. Non-admin roles get the read-only
// posture card. Server-side enforcement ALWAYS lives in the policy engine —
// this surface can never grant itself autonomy.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import {
  useInstitutionAutonomy,
  useUpdateInstitutionAutonomy,
} from "@/ai/hooks/useInstitutionAutonomy";
import { useAiIdentity } from "@/ai/hooks/useAiIdentity";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

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

interface AutonomyDraft {
  ceiling: (typeof CEILING_VALUES)[number];
  autoExecute: boolean;
  rollback: boolean;
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

const AutonomyFlagRow = ({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-2">
    <dt className="text-slate-600">{label}</dt>
    <dd>{children}</dd>
  </div>
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
  const { role } = useAiIdentity();
  const { data, isLoading, isError } = useInstitutionAutonomy();
  const update = useUpdateInstitutionAutonomy();
  const isAdmin = role === "admin";

  const parsed = data ? autonomyRowSchema.safeParse(data) : null;
  const settings = parsed?.success ? parsed.data : null;

  const [draft, setDraft] = useState<AutonomyDraft | null>(null);
  const effective: AutonomyDraft = draft ?? {
    ceiling: settings?.operational_autonomy_ceiling ?? "A2",
    autoExecute: settings?.auto_execute_low_risk ?? false,
    rollback: settings?.rollback_enabled ?? true,
  };

  const save = (): void => {
    update.mutate(
      {
        operational_autonomy_ceiling: effective.ceiling,
        auto_execute_low_risk: effective.autoExecute,
        rollback_enabled: effective.rollback,
      },
      {
        onSuccess: () => {
          setDraft(null);
          toast.success(t("autonomyControl.saved"));
        },
        onError: () => {
          toast.error(t("autonomyControl.saveError"));
        },
      }
    );
  };

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
          <AutonomyFlagRow label={t("autonomyControl.ceiling")}>
            {isAdmin ? (
              <Select
                value={effective.ceiling}
                onValueChange={(value) =>
                  setDraft({
                    ...effective,
                    ceiling: value as AutonomyDraft["ceiling"],
                  })
                }
              >
                <SelectTrigger
                  className="h-8 w-24 text-xs font-bold"
                  aria-label={t("autonomyControl.ceiling")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CEILING_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="rounded-md bg-sky-50 px-2 py-1 font-bold text-sky-700">
                {effective.ceiling}
              </span>
            )}
          </AutonomyFlagRow>
          <AutonomyFlagRow label={t("autonomyControl.autoExecute")}>
            {isAdmin ? (
              <Switch
                checked={effective.autoExecute}
                onCheckedChange={(checked) =>
                  setDraft({ ...effective, autoExecute: checked })
                }
                aria-label={t("autonomyControl.autoExecute")}
              />
            ) : (
              <FlagPill
                label={
                  effective.autoExecute
                    ? t("autonomyControl.enabled")
                    : t("autonomyControl.disabled")
                }
                on={effective.autoExecute}
              />
            )}
          </AutonomyFlagRow>
          <AutonomyFlagRow label={t("autonomyControl.rollback")}>
            {isAdmin ? (
              <Switch
                checked={effective.rollback}
                onCheckedChange={(checked) =>
                  setDraft({ ...effective, rollback: checked })
                }
                aria-label={t("autonomyControl.rollback")}
              />
            ) : (
              <FlagPill
                label={
                  effective.rollback
                    ? t("autonomyControl.enabled")
                    : t("autonomyControl.disabled")
                }
                on={effective.rollback}
              />
            )}
          </AutonomyFlagRow>
          {!settings && (
            <p className="pt-1 text-[11px] italic text-slate-500">
              {t("autonomyControl.defaultPosture")}
            </p>
          )}
          {isAdmin ? (
            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-[11px] italic text-slate-500">
                {t("autonomyControl.enforcesNextRun")}
              </p>
              <Button
                size="sm"
                className="h-8 text-xs"
                disabled={!draft || update.isPending}
                onClick={save}
              >
                {update.isPending
                  ? t("autonomyControl.saving")
                  : t("autonomyControl.save")}
              </Button>
            </div>
          ) : null}
        </dl>
      )}
    </section>
  );
};

export default AgentAutonomyControl;
