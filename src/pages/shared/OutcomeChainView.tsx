// =============================================================================
// OutcomeChainView — end-to-end OBE outcome chain (Feature: qa-partner-review-
// remediation, Req 16)
// =============================================================================
//
// Renders the full traceability chain for a selected starting outcome (an ILO):
//   ILO → GA → PLO → CLO → Assessment → Rubric → Student → Attainment
// Graduate Attributes are shown as a level between the ILO and the PLOs
// (Req 16.1, 16.2, 16.3). When no level has any linked record for the chosen
// start, a single unified empty state is shown for the whole chain rather than
// per-level zeros (Req 16.4). Attainment at any node uses the platform
// attainment-level color coding (Req 16.5).
//
// All data access goes through the `useOutcomeChain` / `useILOs` hooks — no raw
// Supabase calls in this component.

import { parseAsString, useQueryState } from "nuqs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EmptyState from "@/components/shared/EmptyState";
import Shimmer from "@/components/shared/Shimmer";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { Workflow, Award, Target, FileText, Ruler, User } from "lucide-react";
import { useILOs } from "@/hooks/useILOs";
import { useOutcomeChain } from "@/hooks/useOutcomeChain";
import { resolveName } from "@/lib/db/resolveName";
import {
  getAttainmentColor,
  classifyAttainment,
} from "@/lib/attainmentClassifier";
import type {
  AssessmentNode,
  CloNode,
  GraduateAttributeNode,
  PloNode,
} from "@/lib/outcomeChain";

const ATTAINMENT_LABEL: Record<string, string> = {
  Excellent: "Excellent",
  Satisfactory: "Satisfactory",
  Developing: "Developing",
  Not_Yet: "Not Yet",
};

// Attainment chip with platform color coding (Req 16.5). Renders nothing when
// no attainment is available at the node so we never show a misleading 0%.
const AttainmentChip = ({ percent }: { percent: number | null }) => {
  if (percent === null || percent === undefined) return null;
  const rounded = Math.round(percent);
  const level = classifyAttainment(rounded);
  return (
    <span
      className="inline-flex items-center justify-center min-w-12 px-2 py-0.5 rounded-md text-xs font-bold text-white"
      style={{ backgroundColor: getAttainmentColor(rounded) }}
      title={`${rounded}% — ${ATTAINMENT_LABEL[level] ?? level}`}
    >
      {rounded}%
    </span>
  );
};

// ── Level heading: a labelled band that introduces each chain level ──────────
const LevelLabel = ({
  icon: Icon,
  label,
  count,
}: {
  icon: typeof Award;
  label: string;
  count: number;
}) => (
  <div className="flex items-center gap-2">
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
      <Icon className="h-4 w-4" />
    </span>
    <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">
      {label}
    </span>
    <span className="text-[10px] font-bold text-slate-400">· {count}</span>
  </div>
);

// ── Connector between levels ─────────────────────────────────────────────────
const Connector = () => (
  <div className="ms-3 my-1 h-4 w-px bg-slate-200" aria-hidden="true" />
);

// ── Assessment → Rubric leaf ─────────────────────────────────────────────────
const AssessmentCard = ({ assessment }: { assessment: AssessmentNode }) => (
  <div className="rounded-lg border border-slate-100 bg-white p-2.5">
    <div className="flex items-center gap-2">
      <FileText className="h-3.5 w-3.5 text-amber-500 shrink-0" />
      <span className="text-xs font-medium truncate">
        {resolveName(assessment.title)}
      </span>
      <span className="ms-auto text-[10px] text-slate-400">
        {assessment.weight}%
      </span>
    </div>
    {assessment.rubric && (
      <div className="mt-1.5 flex items-center gap-1.5 ps-5 text-[11px] text-slate-500">
        <Ruler className="h-3 w-3 text-slate-400" />
        <span className="truncate">{resolveName(assessment.rubric.title)}</span>
      </div>
    )}
  </div>
);

// ── CLO node with its assessments, rubrics, and student attainment leaves ────
const CloCard = ({ clo }: { clo: CloNode }) => (
  <div className="rounded-xl border border-green-100 bg-green-50/40 p-3">
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className="border-green-200 bg-green-100 text-green-700"
      >
        CLO
      </Badge>
      <span className="text-sm font-medium truncate">
        {resolveName(clo.title)}
      </span>
      <span className="ms-auto">
        <AttainmentChip percent={clo.attainmentPercent} />
      </span>
    </div>

    {/* Assessment → Rubric level */}
    {clo.assessments.length > 0 && (
      <div className="mt-2 ps-2">
        <LevelLabel
          icon={FileText}
          label="Assessments"
          count={clo.assessments.length}
        />
        <div className="mt-1.5 space-y-1.5">
          {clo.assessments.map((a) => (
            <AssessmentCard key={`${clo.id}-${a.id}`} assessment={a} />
          ))}
        </div>
      </div>
    )}

    {/* Rubrics attached directly to the CLO (rubrics.clo_id) */}
    {clo.rubrics.length > 0 && (
      <div className="mt-2 ps-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">
          Rubrics
        </span>
        {clo.rubrics.map((r) => (
          <Badge
            key={r.id}
            variant="outline"
            className="border-slate-200 bg-white text-slate-600"
          >
            <Ruler className="me-1 h-3 w-3" />
            {resolveName(r.title)}
          </Badge>
        ))}
      </div>
    )}

    {/* Student → Attainment level */}
    {clo.students.length > 0 && (
      <div className="mt-2 ps-2">
        <LevelLabel icon={User} label="Students" count={clo.students.length} />
        <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {clo.students.map((s) => (
            <div
              key={`${clo.id}-${s.studentId}`}
              className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-2.5 py-1.5"
            >
              <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-xs truncate">
                {resolveName(s.studentName)}
              </span>
              <span className="ms-auto">
                <AttainmentChip percent={s.attainmentPercent} />
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// ── PLO node with its CLOs ───────────────────────────────────────────────────
const PloCard = ({ plo }: { plo: PloNode }) => (
  <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className="border-blue-200 bg-blue-100 text-blue-700"
      >
        PLO
      </Badge>
      <span className="text-sm font-semibold truncate">
        {resolveName(plo.title)}
      </span>
      <span className="ms-auto">
        <AttainmentChip percent={plo.attainmentPercent} />
      </span>
    </div>
    {plo.clos.length > 0 ? (
      <div className="mt-2 ps-2">
        <LevelLabel icon={Target} label="CLOs" count={plo.clos.length} />
        <div className="mt-1.5 space-y-2">
          {plo.clos.map((clo) => (
            <CloCard key={clo.id} clo={clo} />
          ))}
        </div>
      </div>
    ) : (
      <p className="mt-2 ps-2 text-xs text-slate-400">
        No course outcomes mapped under this program outcome.
      </p>
    )}
  </div>
);

// ── GA node (level between ILO and PLO, Req 16.3) ────────────────────────────
const GaCard = ({ ga }: { ga: GraduateAttributeNode }) => (
  <div className="flex items-center gap-2 rounded-xl border border-purple-100 bg-purple-50/50 px-3 py-2">
    <Award className="h-4 w-4 text-purple-500 shrink-0" />
    <span className="text-sm font-medium truncate">{resolveName(ga.name)}</span>
    {ga.weight !== null && (
      <span className="text-[10px] text-slate-400">· {ga.weight}%</span>
    )}
    <span className="ms-auto">
      <AttainmentChip percent={ga.attainmentPercent} />
    </span>
  </div>
);

const OutcomeChainView = () => {
  const [startId, setStartId] = useQueryState(
    "ilo",
    parseAsString.withDefault("")
  );
  const { data: iloPage, isLoading: ilosLoading } = useILOs({ pageSize: 1000 });
  const ilos = iloPage?.data ?? [];
  const {
    data: chain,
    isLoading: chainLoading,
    isError,
  } = useOutcomeChain(startId || undefined);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Outcome Chain</h1>
          <p className="text-sm text-slate-500">
            Trace attainment end-to-end: ILO → GA → PLO → CLO → Assessment →
            Rubric → Student.
          </p>
        </div>
        <Select value={startId} onValueChange={setStartId}>
          <SelectTrigger className="w-72 bg-white">
            <SelectValue
              placeholder={
                ilosLoading
                  ? "Loading outcomes…"
                  : "Select an institution outcome"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {ilos.map((ilo) => (
              <SelectItem key={ilo.id} value={ilo.id}>
                {resolveName(ilo.title)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{ background: "var(--brand-gradient)" }}
        >
          <Workflow className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            End-to-End Outcome Chain
          </h2>
        </div>
        <div className="p-6">
          {!startId ? (
            <EmptyState
              icon={<Workflow className="h-8 w-8 text-gray-400" />}
              title="Select an institution outcome"
              description="Choose an ILO above to trace its connected graduate attributes, program and course outcomes, assessments, rubrics, and student attainment."
            />
          ) : chainLoading ? (
            <div className="space-y-3">
              <Shimmer className="h-12 rounded-xl" />
              <Shimmer className="h-24 rounded-xl" />
              <Shimmer className="h-40 rounded-xl" />
            </div>
          ) : isError ? (
            <EmptyState
              icon={<Workflow className="h-8 w-8 text-red-400" />}
              title="Couldn't load the outcome chain"
              description="Something went wrong building this chain. Please try again."
            />
          ) : !chain || chain.isEmpty ? (
            // Req 16.4 — a single unified empty state for the whole chain when
            // no level has any linked record (never per-level zeros).
            <EmptyState
              icon={<Workflow className="h-8 w-8 text-gray-400" />}
              title="No connected outcomes yet"
              description="This outcome has no graduate attributes, program outcomes, course outcomes, assessments, or attainment linked to it yet. Map outcomes to build the chain."
            />
          ) : (
            <ErrorBoundary
              fallback={
                <p className="text-sm text-red-500">
                  Unable to display the outcome chain.
                </p>
              }
            >
              <div className="space-y-2">
                {/* ── ILO (start) ─────────────────────────────────────── */}
                <LevelLabel
                  icon={Award}
                  label="Institution Outcome"
                  count={1}
                />
                <div className="rounded-xl border border-red-100 bg-red-50/50 p-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-red-200 bg-red-100 text-red-700"
                    >
                      ILO
                    </Badge>
                    <span className="text-sm font-semibold truncate">
                      {resolveName(chain.start.title)}
                    </span>
                    <span className="ms-auto">
                      <AttainmentChip percent={chain.start.attainmentPercent} />
                    </span>
                  </div>
                </div>

                <Connector />

                {/* ── GA level (between ILO and PLO, Req 16.3) ────────── */}
                <LevelLabel
                  icon={Award}
                  label="Graduate Attributes"
                  count={chain.graduateAttributes.length}
                />
                {chain.graduateAttributes.length > 0 ? (
                  <div className="space-y-1.5">
                    {chain.graduateAttributes.map((ga) => (
                      <GaCard key={ga.id} ga={ga} />
                    ))}
                  </div>
                ) : (
                  <p className="ps-2 text-xs text-slate-400">
                    No graduate attributes mapped to this outcome.
                  </p>
                )}

                <Connector />

                {/* ── PLO → CLO → Assessment → Rubric → Student levels ── */}
                <LevelLabel
                  icon={Target}
                  label="Program Outcomes"
                  count={chain.plos.length}
                />
                {chain.plos.length > 0 ? (
                  <div className="space-y-2">
                    {chain.plos.map((plo) => (
                      <PloCard key={plo.id} plo={plo} />
                    ))}
                  </div>
                ) : (
                  <p className="ps-2 text-xs text-slate-400">
                    No program outcomes mapped to this outcome.
                  </p>
                )}
              </div>
            </ErrorBoundary>
          )}
        </div>
      </Card>
    </div>
  );
};

export default OutcomeChainView;
