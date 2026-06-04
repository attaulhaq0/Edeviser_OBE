// Feature: qa-partner-review-remediation — Req 4 (B4)
// Admin Historical Evidence dashboard. Renders attainment evidence over time
// from the `mv_historical_evidence` materialized view via the
// `useHistoricalEvidence` hook. The previous placeholder rendered developer
// text ("Requires mv_historical_evidence view"); that is removed entirely so
// no internal object names, migration ids, or developer instructions reach a
// user-facing surface (Req 4.5, 4.7).
//
// Rendering states (mutually exclusive):
//   loading → component-level Shimmer
//   error   → user-friendly error message (distinct from no-data)
//   empty   → shared NoEvidence empty state
//   data    → per-semester cards with an outcome/Bloom's attainment table

import { useMemo } from "react";
import { parseAsString, useQueryState } from "nuqs";
import { useTranslation } from "react-i18next";
import { AlertTriangle, History } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NoEvidence } from "@/components/shared/EmptyState";
import Shimmer from "@/components/shared/Shimmer";
import {
  useHistoricalEvidence,
  type HistoricalEvidenceRow,
} from "@/hooks/useHistoricalEvidence";
import { historicalEvidenceFilterSchema } from "@/lib/schemas/historicalEvidence";
import {
  getAttainmentTextClass,
  getAttainmentBadgeStyle,
} from "@/lib/attainmentClassifier";

// Sentinel for the "no filter" Select option — Radix Select disallows an empty
// string value, so the cleared state is represented by this token and mapped
// back to `null` (no filter) before reaching the schema.
const ALL = "all";

// Outcome types the materialized view emits. Kept in sync with the schema enum.
const OUTCOME_TYPE_OPTIONS = ["PLO", "CLO"] as const;
const BLOOMS_OPTIONS = [
  "remembering",
  "understanding",
  "applying",
  "analyzing",
  "evaluating",
  "creating",
] as const;

const OUTCOME_TYPE_BADGE: Record<string, string> = {
  ILO: "bg-red-100 text-red-700 border-red-200",
  PLO: "bg-blue-100 text-blue-700 border-blue-200",
  CLO: "bg-green-100 text-green-700 border-green-200",
  SUB_CLO: "bg-green-50 text-green-700 border-green-200",
};

interface SemesterGroup {
  semesterId: string;
  semesterName: string;
  rows: HistoricalEvidenceRow[];
}

const HistoricalEvidenceDashboard = () => {
  const { t } = useTranslation("common");

  // URL-persisted filter state (nuqs). Empty default → cleared.
  const [outcomeType, setOutcomeType] = useQueryState(
    "type",
    parseAsString.withDefault("")
  );
  const [bloomsLevel, setBloomsLevel] = useQueryState(
    "blooms",
    parseAsString.withDefault("")
  );

  // Validate the raw URL values through the shared schema so only legal enum
  // members ever reach the query (an unexpected value falls back to "no
  // filter" rather than producing an invalid request).
  const filters = useMemo(() => {
    const parsed = historicalEvidenceFilterSchema.safeParse({
      outcomeType: outcomeType || undefined,
      bloomsLevel: bloomsLevel || undefined,
    });
    return parsed.success ? parsed.data : {};
  }, [outcomeType, bloomsLevel]);

  const { data, isLoading, isError } = useHistoricalEvidence(filters);

  // Group rows by semester (the hook returns them ordered by start_date asc).
  const semesterGroups = useMemo<SemesterGroup[]>(() => {
    const groups = new Map<string, SemesterGroup>();
    for (const row of data ?? []) {
      const existing = groups.get(row.semester_id);
      if (existing) {
        existing.rows.push(row);
      } else {
        groups.set(row.semester_id, {
          semesterId: row.semester_id,
          semesterName: row.semester_name,
          rows: [row],
        });
      }
    }
    return Array.from(groups.values());
  }, [data]);

  const hasData = (data?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Historical Evidence
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={outcomeType || ALL}
            onValueChange={(value) =>
              setOutcomeType(value === ALL ? "" : value)
            }
          >
            <SelectTrigger className="w-44 bg-white">
              <SelectValue placeholder="All outcome types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All outcome types</SelectItem>
              {OUTCOME_TYPE_OPTIONS.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={bloomsLevel || ALL}
            onValueChange={(value) =>
              setBloomsLevel(value === ALL ? "" : value)
            }
          >
            <SelectTrigger className="w-48 bg-white">
              <SelectValue placeholder="All Bloom's levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Bloom's levels</SelectItem>
              {BLOOMS_OPTIONS.map((level) => (
                <SelectItem key={level} value={level}>
                  {t(`blooms.${level}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{ background: "var(--brand-gradient)" }}
        >
          <History className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            Evidence Analytics
          </h2>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              <Shimmer className="h-10 w-48 rounded-lg" />
              <Shimmer className="h-48 rounded-lg" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="mb-3 h-10 w-10 text-amber-500" />
              <p className="text-sm font-semibold text-gray-700">
                We couldn't load historical evidence right now.
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Please refresh the page or try again in a moment.
              </p>
            </div>
          ) : !hasData ? (
            <NoEvidence className="border-0 shadow-none py-4" />
          ) : (
            <div className="space-y-8">
              {semesterGroups.map((group) => (
                <SemesterSection key={group.semesterId} group={group} />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

interface SemesterSectionProps {
  group: SemesterGroup;
}

const SemesterSection = ({ group }: SemesterSectionProps) => {
  const { t } = useTranslation("common");

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-bold tracking-tight text-gray-900">
          {group.semesterName || "—"}
        </h3>
        <span className="text-xs text-gray-500">
          {group.rows.length} outcome{group.rows.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Outcome</TableHead>
              <TableHead>Bloom's Level</TableHead>
              <TableHead className="text-right">Evidence</TableHead>
              <TableHead className="text-right">Avg Score</TableHead>
              <TableHead className="text-right">
                {t("attainment.excellent")}
              </TableHead>
              <TableHead className="text-right">
                {t("attainment.satisfactory")}
              </TableHead>
              <TableHead className="text-right">
                {t("attainment.developing")}
              </TableHead>
              <TableHead className="text-right">
                {t("attainment.notYet")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.rows.map((row, index) => (
              <TableRow
                key={`${row.outcome_type}-${row.blooms_level ?? "na"}-${index}`}
              >
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      OUTCOME_TYPE_BADGE[row.outcome_type] ??
                      "bg-slate-100 text-slate-700 border-slate-200"
                    }
                  >
                    {row.outcome_type || "—"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {row.blooms_level ? t(`blooms.${row.blooms_level}`) : "—"}
                </TableCell>
                <TableCell className="text-right text-sm font-medium tabular-nums">
                  {row.evidence_count}
                </TableCell>
                <TableCell
                  className={`text-right text-sm font-bold tabular-nums ${getAttainmentTextClass(
                    row.avg_score
                  )}`}
                >
                  {Math.round(row.avg_score)}%
                </TableCell>
                <TableCell className="text-right">
                  <BandCount count={row.excellent_count} percent={90} />
                </TableCell>
                <TableCell className="text-right">
                  <BandCount count={row.satisfactory_count} percent={75} />
                </TableCell>
                <TableCell className="text-right">
                  <BandCount count={row.developing_count} percent={60} />
                </TableCell>
                <TableCell className="text-right">
                  <BandCount count={row.not_yet_count} percent={30} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
};

interface BandCountProps {
  count: number;
  // Representative percentage for the band, used only to pick the band color.
  percent: number;
}

const BandCount = ({ count, percent }: BandCountProps) => (
  <span
    className={`inline-flex min-w-8 justify-center rounded-md border px-2 py-0.5 text-xs font-bold tabular-nums ${getAttainmentBadgeStyle(
      percent
    )}`}
  >
    {count}
  </span>
);

export default HistoricalEvidenceDashboard;
