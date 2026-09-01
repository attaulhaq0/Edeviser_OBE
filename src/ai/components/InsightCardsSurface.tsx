// Feature: Proactive insight-cards surface (tasks.md 3.5 — Wave D mounts).
//
// Hosted under the "insight-cards" (teacher/admin/coordinator) and
// "suggestions" (student) surfaces. Data comes from the sanctioned
// get_my_proactive_intelligence_v1 SECURITY DEFINER RPC via
// useProactiveSuggestions — actor + role + institution re-checked per row
// server-side. Fail-closed: loading shimmer, explicit empty state, and an
// unavailable notice on error; invalid rows never render.

import { useTranslation } from "react-i18next";
import { Lightbulb, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shimmer } from "@/design-system";
import type { HostedSurfaceProps } from "@/ai/components/EdeviserAssistantPanel";
import { useProactiveSuggestions } from "@/ai/hooks/useProactiveSuggestions";
import { cn } from "@/lib/utils";

export interface InsightCardsSurfaceProps extends HostedSurfaceProps {
  readonly className?: string;
}

const InsightCardsSurface = ({ className }: InsightCardsSurfaceProps) => {
  const { t } = useTranslation("ai");
  const { data, isLoading, isError } = useProactiveSuggestions();

  return (
    <Card className={cn("border-slate-200/60 bg-white/80", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Sparkles
            className="h-4 w-4 shrink-0 text-sky-600"
            aria-hidden="true"
          />
          {t("insightCards.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2" aria-hidden="true">
            <Shimmer className="h-14 rounded-lg" />
            <Shimmer className="h-14 rounded-lg" />
          </div>
        ) : isError ? (
          <p className="py-2 text-xs text-slate-500">
            {t("insightCards.unavailable")}
          </p>
        ) : !data || data.length === 0 ? (
          <p className="py-2 text-xs text-slate-500">
            {t("insightCards.empty")}
          </p>
        ) : (
          <ul className="space-y-3">
            {data.map((suggestion) => (
              <li
                key={suggestion.id}
                className="rounded-lg border border-slate-200/60 bg-slate-50/60 p-3"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb
                    className="h-3.5 w-3.5 shrink-0 text-amber-500"
                    aria-hidden="true"
                  />
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold uppercase tracking-wide"
                  >
                    {suggestion.specialist}
                  </Badge>
                  {suggestion.pendingProposals.length > 0 ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold text-amber-700"
                    >
                      {t("insightCards.pendingProposals", {
                        count: suggestion.pendingProposals.length,
                      })}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-700">
                  {suggestion.recommendation}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default InsightCardsSurface;
