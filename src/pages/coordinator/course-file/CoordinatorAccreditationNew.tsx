// =============================================================================
// CoordinatorAccreditationNew — redesigned Accreditation Evidence (P3, task 3.3)
// =============================================================================
//
// Matches the prototype reference: an Accreditation Readiness hero (overall ring
// + Complete/In-progress/Blocked/Not-started tiles), course evidence status
// cards, an Accreditation Pack checklist, an Approval Workflow timeline
// (Coordinator → HOD → QA → Accreditation Office), and the REAL "Generate
// Course File" tool (preserves the legacy page's function).
//
// DATA (Phase C backend wiring):
//   • Readiness hero + tiles + course evidence cards + pack checklist → REAL,
//     from get_coordinator_accreditation_readiness (evidence-coverage derived
//     from courses/outcomes/evidence/attainment/cqi). Fails soft to a neutral
//     "pending" state if the RPC isn't deployed yet.
//   • Approval workflow → accreditation_approvals (renders the default four
//     stages until the chain has rows).
//   • Generate Course File → REAL (useCourses / useSemesters /
//     useGenerateCourseFile — same mutation as the legacy page).
// No client writes here. Gated behind `newUiModules` (wrapper in
// CourseFileGenerator.tsx); flag-off keeps the legacy generator. RTL-safe.
// =============================================================================

import { useState } from "react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  FileText,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  Button,
  PCard,
  Label,
  MasteryRing,
  SectionHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Shimmer,
} from "@/design-system";
import { useCourses } from "@/hooks/useCourses";
import { useSemesters } from "@/hooks/useSemesters";
import { useGenerateCourseFile } from "@/hooks/useCourseFile";
import { useAuth } from "@/hooks/useAuth";
import {
  useCoordinatorAccreditationReadiness,
  useAccreditationApprovals,
  type EvidenceStatus,
} from "@/hooks/useCoordinatorAccreditation";
import { cn } from "@/lib/utils";

type IconType = ComponentType<{ className?: string }>;
type EvStatus = "signed" | "draft" | "blocked" | "notStarted";
type PackState = "done" | "prog" | "pending";
type WfState = "done" | "current" | "pending";

const EV_STYLES: Record<
  EvStatus,
  { pill: string; icon: IconType; tint: string }
> = {
  signed: {
    pill: "bg-green-50 text-green-600",
    icon: CheckCircle2,
    tint: "text-green-600",
  },
  draft: {
    pill: "bg-amber-50 text-amber-700",
    icon: Clock,
    tint: "text-amber-600",
  },
  blocked: {
    pill: "bg-red-50 text-red-600",
    icon: XCircle,
    tint: "text-red-600",
  },
  notStarted: {
    pill: "bg-slate-100 text-slate-500",
    icon: Circle,
    tint: "text-slate-400",
  },
};

// ── Readiness status tile ────────────────────────────────────────────────────
const RdTile = ({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: string;
}) => (
  <div className="rounded-xl border border-slate-100 p-3 text-center">
    <p className={cn("text-xl font-black leading-none", tone)}>{value}</p>
    <p className="mt-1 text-[11px] text-slate-500">{label}</p>
  </div>
);

// ── Course evidence card ─────────────────────────────────────────────────────
const EvCard = ({
  code,
  name,
  status,
  statusLabel,
}: {
  code: string;
  name: string;
  status: EvStatus;
  statusLabel: string;
}) => {
  const s = EV_STYLES[status];
  const Icon = s.icon;
  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-black text-slate-400">{code}</span>
        <Icon className={cn("h-4 w-4", s.tint)} aria-hidden="true" />
      </div>
      <p className="mt-1 truncate text-sm font-bold text-gray-900">{name}</p>
      <span
        className={cn(
          "mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold",
          s.pill
        )}
      >
        {statusLabel}
      </span>
    </div>
  );
};

// ── Pack checklist row ───────────────────────────────────────────────────────
const CheckRow = ({
  label,
  statusLabel,
  state,
}: {
  label: string;
  statusLabel: string;
  state: PackState;
}) => {
  const map = {
    done: { icon: CheckCircle2, cls: "text-green-600" },
    prog: { icon: Clock, cls: "text-amber-600" },
    pending: { icon: Circle, cls: "text-slate-400" },
  } as const;
  const { icon: Icon, cls } = map[state];
  return (
    <li className="flex items-center justify-between gap-2 py-1.5">
      <span className="flex items-center gap-2 text-sm text-gray-700">
        <Icon className={cn("h-4 w-4 shrink-0", cls)} aria-hidden="true" />
        {label}
      </span>
      <span className={cn("text-[11px] font-semibold", cls)}>
        {statusLabel}
      </span>
    </li>
  );
};

// ── Approval workflow step ───────────────────────────────────────────────────
const WfStep = ({
  label,
  statusLabel,
  state,
  last,
}: {
  label: string;
  statusLabel: string;
  state: WfState;
  last?: boolean;
}) => {
  const map = {
    done: {
      dot: "bg-green-500 text-white",
      pill: "bg-green-50 text-green-600",
    },
    current: {
      dot: "bg-blue-600 text-white",
      pill: "bg-blue-50 text-blue-600",
    },
    pending: {
      dot: "bg-slate-200 text-slate-500",
      pill: "bg-slate-100 text-slate-500",
    },
  } as const;
  const s = map[state];
  return (
    <li className="flex flex-1 items-center gap-2">
      <div className="flex flex-col items-center gap-1">
        <span
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-black",
            s.dot
          )}
        >
          {state === "done" ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : state === "current" ? (
            <Clock className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Circle className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-gray-800">{label}</p>
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
            s.pill
          )}
        >
          {statusLabel}
        </span>
      </div>
      {!last && (
        <span
          className="mx-1 hidden h-px flex-1 bg-slate-200 sm:block"
          aria-hidden="true"
        />
      )}
    </li>
  );
};

const CoordinatorAccreditationNew = () => {
  const { t } = useTranslation("coordinator");
  const { institutionId } = useAuth();

  // ── REAL accreditation readiness + approval chain ────────────────────────
  const readinessQuery = useCoordinatorAccreditationReadiness(institutionId);
  const readiness = readinessQuery.data;
  const approvalsQuery = useAccreditationApprovals(institutionId);

  // ── REAL course-file generation (preserves legacy function) ──────────────
  const { data: coursesResult, isLoading: coursesLoading } = useCourses({
    pageSize: 200,
  });
  const { data: semesters, isLoading: semestersLoading } = useSemesters();
  const generateMutation = useGenerateCourseFile();
  const [courseId, setCourseId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [lastResult, setLastResult] = useState<{
    download_url: string;
    course_name: string;
    course_code: string;
    semester: string;
    generated_at: string;
  } | null>(null);

  const courses = coursesResult?.data ?? [];
  const formLoading = coursesLoading || semestersLoading;

  const handleGenerate = () => {
    if (!courseId) {
      toast.error(t("accreditation.selectCourseError"));
      return;
    }
    if (!semesterId) {
      toast.error(t("accreditation.selectSemesterError"));
      return;
    }
    setLastResult(null);
    generateMutation.mutate(
      { course_id: courseId, semester_id: semesterId },
      {
        onSuccess: (result) => {
          setLastResult({
            download_url: result.download_url,
            course_name: result.course_name,
            course_code: result.course_code,
            semester: result.semester,
            generated_at: result.generated_at,
          });
          toast.success(t("accreditation.generateSuccess"));
        },
        onError: (err) => {
          toast.error(
            err instanceof Error
              ? err.message
              : t("accreditation.generateError")
          );
        },
      }
    );
  };

  // ── Derived from real readiness (evidence coverage) ──────────────────────
  const EV_STATUS_MAP: Record<EvidenceStatus, EvStatus> = {
    documented: "signed",
    partial: "draft",
    blocked: "blocked",
    not_started: "notStarted",
  };
  const courseEvidence = (readiness?.courses ?? []).map((c) => ({
    code: c.code,
    name: c.name,
    status: EV_STATUS_MAP[c.status] ?? "notStarted",
  }));

  // ── T28 (E3.D): auto-readiness gate on the Generate form ───────────────────
  // The selected course's live evidence status warns before generation and
  // blocks it entirely when the course has no assembled evidence yet.
  const selectedCourse = courses.find((c) => c.id === courseId);
  const selectedEvidenceStatus = courseEvidence.find(
    (c) => selectedCourse && c.code === selectedCourse.code
  )?.status;
  const readinessGateBlocked = selectedEvidenceStatus === "notStarted";
  const readinessGateWarn =
    selectedEvidenceStatus === "draft" || selectedEvidenceStatus === "blocked";

  const statusLabel = (s: EvStatus) =>
    s === "signed"
      ? t("accreditation.statusDocumented")
      : s === "draft"
      ? t("accreditation.statusPartial")
      : s === "blocked"
      ? t("accreditation.statusBlocked")
      : t("accreditation.statusNotStarted");

  const PACK_LABEL: Record<string, string> = {
    cloMapping: t("accreditation.packCloMapping"),
    samples: t("accreditation.packSamples"),
    analysis: t("accreditation.packAnalysis"),
    cqi: t("accreditation.packCqi"),
  };
  const packItems = (readiness?.pack ?? []).map((p) => ({
    label: PACK_LABEL[p.key] ?? p.key,
    state: p.state as PackState,
  }));
  const packStateLabel = (s: PackState) =>
    s === "done"
      ? t("accreditation.packComplete")
      : s === "prog"
      ? t("accreditation.packInProgress")
      : t("accreditation.packOutstanding");

  // ── Approval workflow: default four stages until the chain has rows ───────
  const CANON_STAGES = ["coordinator", "hod", "qa", "office"] as const;
  const WF_LABEL: Record<string, string> = {
    coordinator: t("accreditation.wf1"),
    hod: t("accreditation.wf2"),
    qa: t("accreditation.wf3"),
    office: t("accreditation.wf4"),
  };
  const workflow = (() => {
    const byStage = new Map(
      (approvalsQuery.data ?? []).map((r) => [r.stage, r.status as WfState])
    );
    const states: WfState[] = CANON_STAGES.map(
      (s) => byStage.get(s) ?? "pending"
    );
    // Default: if nothing is in progress or done, the first stage is current.
    if (!states.some((s) => s === "current" || s === "done")) {
      states[0] = "current";
    }
    return CANON_STAGES.map((s, i) => ({
      label: WF_LABEL[s] ?? s,
      state: states[i] ?? "pending",
    }));
  })();
  const wfStateLabel = (s: WfState) =>
    s === "done"
      ? t("accreditation.wfDone")
      : s === "current"
      ? t("accreditation.wfCurrent")
      : t("accreditation.wfPending");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("accreditation.title")}
        </h1>
        <Link
          to="/coordinator/cqi"
          className="inline-flex items-center gap-1 rounded text-xs font-bold text-sky-700 outline-none hover:text-sky-800 focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          {t("accreditation.viewCqi")}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {/* Accreditation Readiness hero */}
      <PCard className="overflow-hidden">
        <div className="p-6">
          <SectionHeader
            icon={ShieldCheck}
            title={t("accreditation.readiness")}
          />
          {readinessQuery.isPending ? (
            <div className="mt-4">
              <Shimmer className="h-24 rounded-xl" />
            </div>
          ) : readiness ? (
            <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <MasteryRing
                  value={readiness.readinessPercent}
                  size={88}
                  tone="brand"
                />
                <div>
                  <p className="text-xs text-slate-500">
                    {t("accreditation.overallReadiness")}
                  </p>
                  <p className="text-2xl font-black text-sky-700">
                    {readiness.readinessPercent}%
                  </p>
                </div>
              </div>
              <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
                <RdTile
                  value={readiness.documented}
                  label={t("accreditation.complete")}
                  tone="text-green-600"
                />
                <RdTile
                  value={readiness.partial}
                  label={t("accreditation.inProgress")}
                  tone="text-amber-600"
                />
                <RdTile
                  value={readiness.blocked}
                  label={t("accreditation.blocked")}
                  tone="text-red-600"
                />
                <RdTile
                  value={readiness.notStarted}
                  label={t("accreditation.notStarted")}
                  tone="text-slate-500"
                />
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              {t("accreditation.readinessPending")}
            </p>
          )}
        </div>
      </PCard>

      {/* Course evidence status cards */}
      <PCard className="overflow-hidden">
        <div className="p-6">
          <SectionHeader
            icon={FileText}
            title={t("accreditation.courseEvidence")}
          />
          {readinessQuery.isPending ? (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Shimmer key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : courseEvidence.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {courseEvidence.map((c) => (
                <EvCard
                  key={c.code}
                  code={c.code}
                  name={c.name}
                  status={c.status}
                  statusLabel={statusLabel(c.status)}
                />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              {t("accreditation.evidenceEmpty")}
            </p>
          )}
        </div>
      </PCard>

      {/* Pack checklist + Approval workflow */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PCard className="overflow-hidden">
          <div className="p-6">
            <SectionHeader
              icon={CheckCircle2}
              title={t("accreditation.pack")}
            />
            {packItems.length > 0 ? (
              <ul className="mt-3 divide-y divide-slate-100">
                {packItems.map((item) => (
                  <CheckRow
                    key={item.label}
                    label={item.label}
                    statusLabel={packStateLabel(item.state)}
                    state={item.state}
                  />
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                {t("accreditation.packEmpty")}
              </p>
            )}
          </div>
        </PCard>

        <PCard className="overflow-hidden">
          <div className="p-6">
            <SectionHeader
              icon={ShieldCheck}
              title={t("accreditation.workflow")}
            />
            <ul className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start">
              {workflow.map((w, i) => (
                <WfStep
                  key={w.label}
                  label={w.label}
                  statusLabel={wfStateLabel(w.state)}
                  state={w.state}
                  last={i === workflow.length - 1}
                />
              ))}
            </ul>
          </div>
        </PCard>
      </div>

      {/* Generate Course File (REAL) */}
      <PCard className="overflow-hidden">
        <div className="p-6">
          <SectionHeader
            icon={FileText}
            title={t("accreditation.generateTitle")}
          />
          {formLoading ? (
            <div className="mt-4 space-y-4">
              <Shimmer className="h-10 rounded-lg" />
              <Shimmer className="h-10 rounded-lg" />
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="acc-course-select">
                  {t("accreditation.course")}
                </Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger id="acc-course-select" className="bg-white">
                    <SelectValue
                      placeholder={t("accreditation.selectCourse")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                    {courses.length === 0 && (
                      <SelectItem value="__none" disabled>
                        {t("accreditation.noCourses")}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="acc-semester-select">
                  {t("accreditation.semester")}
                </Label>
                <Select value={semesterId} onValueChange={setSemesterId}>
                  <SelectTrigger id="acc-semester-select" className="bg-white">
                    <SelectValue
                      placeholder={t("accreditation.selectSemester")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(semesters ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                    {(!semesters || semesters.length === 0) && (
                      <SelectItem value="__none" disabled>
                        {t("accreditation.noSemesters")}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {readinessGateBlocked && (
            <p className="mt-3 rounded-lg border border-red-100 bg-red-50/70 p-3 text-xs font-semibold text-red-700">
              {t("accreditation.readinessBlocked")}
            </p>
          )}
          {readinessGateWarn && (
            <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50/70 p-3 text-xs font-semibold text-amber-700">
              {t("accreditation.readinessWarning")}
            </p>
          )}

          <Button
            variant="tactile"
            className="mt-4"
            onClick={handleGenerate}
            disabled={
              generateMutation.isPending ||
              !courseId ||
              !semesterId ||
              readinessGateBlocked
            }
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileText className="h-4 w-4" aria-hidden="true" />
            )}
            {generateMutation.isPending
              ? t("accreditation.generating")
              : t("accreditation.generate")}
          </Button>

          {lastResult && (
            <div className="mt-5 rounded-xl border border-green-100 bg-green-50/60 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className="h-5 w-5 text-green-600"
                  aria-hidden="true"
                />
                <p className="text-sm font-bold text-gray-900">
                  {t("accreditation.ready")}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    {t("accreditation.course")}
                  </p>
                  <p className="mt-1 font-semibold">
                    {lastResult.course_code} — {lastResult.course_name}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    {t("accreditation.semester")}
                  </p>
                  <p className="mt-1 font-semibold">{lastResult.semester}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    {t("accreditation.generated")}
                  </p>
                  <p className="mt-1 font-semibold">
                    {lastResult.generated_at.slice(0, 10)}
                  </p>
                </div>
              </div>
              <Button
                variant="tactile"
                size="sm"
                className="mt-3"
                onClick={() =>
                  lastResult.download_url &&
                  window.open(lastResult.download_url, "_blank")
                }
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {t("accreditation.downloadPdf")}
              </Button>
            </div>
          )}
        </div>
      </PCard>
    </div>
  );
};

export default CoordinatorAccreditationNew;
