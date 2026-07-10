// Task 119.2: Gap Analysis View page

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { parseAsString, useQueryState } from "nuqs";
import { useGapAnalysis } from "@/hooks/useVisualizationData";
import { usePrograms } from "@/hooks/usePrograms";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NoOutcomes } from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import Shimmer from "@/components/shared/Shimmer";
import KPICard from "@/components/shared/KPICard";
import SectionHeader from "@/components/shared/SectionHeader";
import MasteryRing from "@/components/shared/MasteryRing";
import { SeverityIcon } from "@/components/shared/SeverityIcon";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { attainmentValueClass } from "@/lib/attainmentTone";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  Search,
  Target,
  ClipboardCheck,
} from "lucide-react";
import type { GapStatus } from "@/lib/gapAnalysis";

const STATUS_CONFIG: Record<
  GapStatus,
  { label: string; color: string; icon: typeof CheckCircle }
> = {
  fully_mapped: {
    label: "Fully Mapped",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  partially_mapped: {
    label: "Partially Mapped",
    color: "bg-yellow-100 text-yellow-700",
    icon: AlertTriangle,
  },
  unmapped: {
    label: "Unmapped",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
  no_evidence: {
    label: "No Evidence",
    color: "bg-gray-100 text-gray-700",
    icon: HelpCircle,
  },
};

// Maps each gap status to a SeverityIcon severity (color + icon by status).
const STATUS_SEVERITY: Record<GapStatus, "low" | "med" | "high" | "neutral"> = {
  fully_mapped: "low",
  partially_mapped: "med",
  unmapped: "high",
  no_evidence: "neutral",
};

const GapAnalysisLegacy = () => {
  const [programId, setProgramId] = useQueryState(
    "program",
    parseAsString.withDefault("")
  );
  const { data: programsData } = usePrograms();
  const programs = programsData?.data ?? [];
  const {
    data: gaps,
    isLoading,
    isError,
    refetch,
  } = useGapAnalysis(programId || undefined);

  const summary = gaps
    ? {
        total: gaps.length,
        fullyMapped: gaps.filter((g) => g.status === "fully_mapped").length,
        withEvidence: gaps.filter((g) => g.evidence_count > 0).length,
      }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Gap Analysis</h1>
        <Select value={programId} onValueChange={setProgramId}>
          <SelectTrigger className="w-64 bg-white">
            <SelectValue placeholder="Select program" />
          </SelectTrigger>
          <SelectContent>
            {(programs ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-white border-0 shadow-md rounded-xl p-4">
            <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
              Total Outcomes
            </p>
            <p className="text-2xl font-black mt-1">{summary.total}</p>
          </Card>
          <Card className="bg-white border-0 shadow-md rounded-xl p-4">
            <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
              Fully Mapped
            </p>
            <p className="text-2xl font-black mt-1 text-green-600">
              {summary.total > 0
                ? Math.round((summary.fullyMapped / summary.total) * 100)
                : 0}
              %
            </p>
          </Card>
          <Card className="bg-white border-0 shadow-md rounded-xl p-4">
            <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
              With Evidence
            </p>
            <p className="text-2xl font-black mt-1 text-blue-600">
              {summary.total > 0
                ? Math.round((summary.withEvidence / summary.total) * 100)
                : 0}
              %
            </p>
          </Card>
        </div>
      )}

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background: "var(--brand-gradient)",
          }}
        >
          <Search className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            Outcome Coverage
          </h2>
        </div>
        <div className="p-6">
          {!programId ? (
            <p className="text-sm text-slate-400 text-center py-12">
              Select a program to analyze gaps.
            </p>
          ) : isLoading ? (
            <Shimmer className="h-64 rounded-lg" />
          ) : isError ? (
            <ErrorState
              message="We couldn't load the gap analysis."
              onRetry={() => refetch()}
              className="py-12"
            />
          ) : !gaps || gaps.length === 0 ? (
            <NoOutcomes className="py-12" />
          ) : (
            <div className="space-y-2">
              {gaps.map((gap) => {
                const config = STATUS_CONFIG[gap.status];
                const Icon = config.icon;
                return (
                  <div
                    key={gap.outcome_id}
                    className="p-3 rounded-lg border border-slate-100 hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {gap.outcome_type}
                        </Badge>
                        <span className="text-sm font-medium">
                          {gap.outcome_title}
                        </span>
                      </div>
                      <Badge className={`text-[10px] ${config.color}`}>
                        <Icon className="h-3 w-3 me-1" />
                        {config.label}
                      </Badge>
                    </div>
                    {gap.flag && (
                      <div className="mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        <span className="text-xs text-amber-600">
                          {gap.flag === "under_mapped"
                            ? "Under-Mapped"
                            : "Unassessed"}
                        </span>
                      </div>
                    )}
                    {gap.recommendation && (
                      <p className="text-xs text-slate-500 mt-1">
                        {gap.recommendation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

// ─── Redesigned view (P3 3.3, flag-gated `newUiModules`) ─────────────────────
// Replaces the local harsh-black KPI cards + inline gradient bar with a
// coverage MasteryRing + shared KPICard row + SectionHeader, and gives each
// outcome row a SeverityIcon by gap status. Reuses the same nuqs `program`
// filter + `useGapAnalysis`/`usePrograms` hooks (no new queries).

const GapAnalysisNew = () => {
  const [programId, setProgramId] = useQueryState(
    "program",
    parseAsString.withDefault("")
  );
  const { data: programsData } = usePrograms();
  const programs = programsData?.data ?? [];
  const {
    data: gaps,
    isLoading,
    isError,
    refetch,
  } = useGapAnalysis(programId || undefined);

  const summary = gaps
    ? {
        total: gaps.length,
        fullyMapped: gaps.filter((g) => g.status === "fully_mapped").length,
        withEvidence: gaps.filter((g) => g.evidence_count > 0).length,
      }
    : null;

  const fullyMappedPct =
    summary && summary.total > 0
      ? Math.round((summary.fullyMapped / summary.total) * 100)
      : 0;
  const withEvidencePct =
    summary && summary.total > 0
      ? Math.round((summary.withEvidence / summary.total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Gap Analysis</h1>
        <Select value={programId} onValueChange={setProgramId}>
          <SelectTrigger className="w-64 bg-white">
            <SelectValue placeholder="Select program" />
          </SelectTrigger>
          <SelectContent>
            {(programs ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {summary && (
        <Card className="card-elevated overflow-hidden border-0 bg-white">
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-5">
              <MasteryRing value={fullyMappedPct} size={104} tone="auto" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Fully Mapped
                </p>
                <p
                  className={`text-3xl font-black ${attainmentValueClass(
                    fullyMappedPct
                  )}`}
                >
                  {fullyMappedPct}%
                </p>
              </div>
            </div>
            <div className="grid flex-1 grid-cols-3 gap-4 sm:ms-auto sm:max-w-md">
              <KPICard
                icon={Target}
                label="Outcomes"
                value={summary.total}
                className="shadow-none ring-1 ring-slate-100"
              />
              <KPICard
                icon={CheckCircle}
                label="Fully Mapped"
                value={`${fullyMappedPct}%`}
                valueClassName={attainmentValueClass(fullyMappedPct)}
                iconBgClass="bg-green-50"
                iconColorClass="text-green-600"
                className="shadow-none ring-1 ring-slate-100"
              />
              <KPICard
                icon={ClipboardCheck}
                label="With Evidence"
                value={`${withEvidencePct}%`}
                valueClassName={attainmentValueClass(withEvidencePct)}
                className="shadow-none ring-1 ring-slate-100"
              />
            </div>
          </div>
        </Card>
      )}

      <Card className="card-elevated overflow-hidden border-0 bg-white">
        <div className="p-6">
          <SectionHeader icon={Search} title="Outcome Coverage" />
          <div className="mt-4">
            {!programId ? (
              <p className="py-12 text-center text-sm text-slate-400">
                Select a program to analyze gaps.
              </p>
            ) : isLoading ? (
              <Shimmer className="h-64 rounded-lg" />
            ) : isError ? (
              <ErrorState
                message="We couldn't load the gap analysis."
                onRetry={() => refetch()}
                className="py-12"
              />
            ) : !gaps || gaps.length === 0 ? (
              <NoOutcomes className="py-12" />
            ) : (
              <div className="space-y-2">
                {gaps.map((gap) => {
                  const config = STATUS_CONFIG[gap.status];
                  const Icon = config.icon;
                  return (
                    <div
                      key={gap.outcome_id}
                      className="flex items-start gap-3 rounded-xl border border-slate-100 p-3 transition-colors hover:bg-slate-50"
                    >
                      <SeverityIcon
                        icon={Icon}
                        severity={STATUS_SEVERITY[gap.status]}
                        size="sm"
                        label={config.label}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {gap.outcome_type}
                          </Badge>
                          <span className="text-sm font-medium text-gray-900 dark:text-foreground">
                            {gap.outcome_title}
                          </span>
                          <Badge
                            className={`ms-auto text-[10px] ${config.color}`}
                          >
                            {config.label}
                          </Badge>
                        </div>
                        {gap.flag && (
                          <div className="mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            <span className="text-xs text-amber-600">
                              {gap.flag === "under_mapped"
                                ? "Under-Mapped"
                                : "Unassessed"}
                            </span>
                          </div>
                        )}
                        {gap.recommendation && (
                          <p className="mt-1 text-xs text-slate-500">
                            {gap.recommendation}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

// Flag wrapper (P3, spec task 3.3): render the redesigned gap analysis when
// `newUiModules` is enabled, else the current (legacy) one.
const GapAnalysisView = () => {
  const newModules = useFeatureFlag("newUiModules");
  return newModules ? <GapAnalysisNew /> : <GapAnalysisLegacy />;
};

export default GapAnalysisView;
