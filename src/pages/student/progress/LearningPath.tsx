import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Check,
  CheckCircle2,
  Clock3,
  GitBranch,
  Lock,
  Map as MapIcon,
  Mountain,
  Play,
  Sparkles,
  TreePine,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PCard, Shimmer } from "@/design-system";
import { useLearningPath } from "@/hooks/useLearningPath";
import type { LearningPathNode } from "@/hooks/useLearningPath";
import {
  averagePercentage,
  buildBloomStageSummaries,
  type BloomStageSummary,
} from "@/lib/learningPathPresentation";
import type { BloomsLevel } from "@/lib/schemas/clo";
import { cn } from "@/lib/utils";

type PathView = "journey" | "tree";

interface BloomDefinition {
  key: BloomsLevel;
  campKey: string;
  titleKey: string;
  subtitleKey: string;
  emoji: string;
  environment: string;
  titleColor: string;
}

interface BloomStage extends BloomDefinition, BloomStageSummary {}

const BLOOM_DEFINITIONS: readonly BloomDefinition[] = [
  {
    key: "remembering",
    campKey: "learningPath.stages.baseCamp",
    titleKey: "learningPath.stages.remember.title",
    subtitleKey: "learningPath.stages.remember.subtitle",
    emoji: "🏕️",
    environment: "bg-green-50",
    titleColor: "text-green-700",
  },
  {
    key: "understanding",
    campKey: "learningPath.stages.campOne",
    titleKey: "learningPath.stages.understand.title",
    subtitleKey: "learningPath.stages.understand.subtitle",
    emoji: "⛺",
    environment: "bg-teal-50",
    titleColor: "text-teal-700",
  },
  {
    key: "applying",
    campKey: "learningPath.stages.campTwo",
    titleKey: "learningPath.stages.apply.title",
    subtitleKey: "learningPath.stages.apply.subtitle",
    emoji: "⛰️",
    environment: "bg-cyan-50",
    titleColor: "text-cyan-800",
  },
  {
    key: "analyzing",
    campKey: "learningPath.stages.campThree",
    titleKey: "learningPath.stages.analyze.title",
    subtitleKey: "learningPath.stages.analyze.subtitle",
    emoji: "🗻",
    environment: "bg-blue-50",
    titleColor: "text-blue-700",
  },
  {
    key: "evaluating",
    campKey: "learningPath.stages.campFour",
    titleKey: "learningPath.stages.evaluate.title",
    subtitleKey: "learningPath.stages.evaluate.subtitle",
    emoji: "🏔️",
    environment: "bg-sky-100",
    titleColor: "text-blue-800",
  },
  {
    key: "creating",
    campKey: "learningPath.stages.summit",
    titleKey: "learningPath.stages.create.title",
    subtitleKey: "learningPath.stages.create.subtitle",
    emoji: "🚩",
    environment: "bg-blue-100",
    titleColor: "text-blue-900",
  },
] as const;

const TREE_POSITIONS = [
  { left: "50%", top: "84%" },
  { left: "31%", top: "66%" },
  { left: "68%", top: "54%" },
  { left: "32%", top: "39%" },
  { left: "67%", top: "24%" },
  { left: "50%", top: "10%" },
] as const;

const MASTERY_LEGEND = [
  {
    color: "bg-green-600",
    labelKey: "learningPath.tree.strong",
    range: "70–100%",
  },
  { color: "bg-teal-600", labelKey: "learningPath.tree.good", range: "40–69%" },
  {
    color: "bg-amber-500",
    labelKey: "learningPath.tree.developing",
    range: "20–39%",
  },
  {
    color: "bg-orange-600",
    labelKey: "learningPath.tree.needsFocus",
    range: "< 20%",
  },
  { color: "bg-slate-400", labelKey: "learningPath.status.locked", range: "—" },
] as const;

const PathProgress = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => (
  <div
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={value}
    className={cn("h-2 overflow-hidden rounded-full bg-slate-100", className)}
  >
    <div
      className="h-full rounded-full bg-[image:var(--brand-gradient)] transition-[width]"
      style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
    />
  </div>
);

const buildPresentedStages = (nodes: LearningPathNode[]): BloomStage[] => {
  const summaries = new Map(
    buildBloomStageSummaries(nodes).map((summary) => [summary.key, summary])
  );
  return BLOOM_DEFINITIONS.flatMap((definition) => {
    const summary = summaries.get(definition.key);
    return summary ? [{ ...definition, ...summary }] : [];
  });
};

const NodeStatusBadge = ({
  status,
}: {
  status: LearningPathNode["status"];
}) => {
  const { t } = useTranslation("student");
  const config: Record<
    LearningPathNode["status"],
    { label: string; className: string }
  > = {
    graded: {
      label: t("learningPath.status.completed"),
      className: "border-green-200 bg-green-50 text-green-700",
    },
    submitted: {
      label: t("learningPath.status.submitted"),
      className: "border-blue-200 bg-blue-50 text-blue-700",
    },
    available: {
      label: t("learningPath.status.available"),
      className: "border-teal-200 bg-teal-50 text-teal-700",
    },
    locked: {
      label: t("learningPath.status.locked"),
      className: "border-slate-200 bg-slate-100 text-slate-500",
    },
  };

  return (
    <Badge
      variant="outline"
      className={cn("shrink-0 text-[10px]", config[status].className)}
    >
      {config[status].label}
    </Badge>
  );
};

const AssignmentCard = ({ node }: { node: LearningPathNode }) => {
  const { t } = useTranslation("student");
  const isLocked = node.status === "locked";
  const isComplete = node.status === "graded";

  return (
    <div
      className={cn(
        "mt-3 flex flex-col gap-3 rounded-[14px] border bg-white p-3 shadow-sm sm:flex-row sm:items-center",
        isLocked && "border-slate-200 bg-white/70 opacity-70",
        isComplete && "border-green-200"
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl",
          isComplete
            ? "bg-green-100 text-green-700"
            : isLocked
            ? "bg-slate-100 text-slate-400"
            : "bg-teal-100 text-teal-700"
        )}
      >
        {isComplete ? (
          <Check className="size-4" aria-hidden="true" />
        ) : isLocked ? (
          <Lock className="size-4" aria-hidden="true" />
        ) : (
          <Play className="size-4" aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-black text-slate-900">
            {node.title}
          </p>
          <NodeStatusBadge status={node.status} />
        </div>
        {node.attainment_percent !== null && !isLocked ? (
          <div className="mt-2 flex items-center gap-2">
            <PathProgress
              value={node.attainment_percent}
              className="h-1.5 flex-1"
            />
            <span className="text-[11px] font-black text-slate-500">
              {node.attainment_percent}%
            </span>
          </div>
        ) : null}
        {isLocked && node.prerequisite ? (
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            {t("learningPath.unlockRequirement", {
              title: node.prerequisite.clo_title,
              percent: node.prerequisite.required_attainment,
            })}
          </p>
        ) : null}
      </div>
      {isLocked ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          className="shrink-0"
        >
          <Lock className="size-3.5" aria-hidden="true" />
          {t("learningPath.actions.locked")}
        </Button>
      ) : (
        <Button
          asChild
          size="sm"
          variant={isComplete ? "outline" : "default"}
          className="shrink-0"
        >
          <Link to={`/student/assignments/${node.assignment_id}`}>
            {isComplete
              ? t("learningPath.actions.review")
              : t("learningPath.actions.continue")}
          </Link>
        </Button>
      )}
    </div>
  );
};

const JourneyStage = ({
  stage,
  index,
  isLast,
}: {
  stage: BloomStage;
  index: number;
  isLast: boolean;
}) => {
  const { t } = useTranslation("student");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex gap-4"
    >
      <div className="flex shrink-0 flex-col items-center">
        <span
          className={cn(
            "relative z-10 flex size-11 items-center justify-center rounded-full text-sm font-black",
            stage.status === "done" && "bg-green-100 text-green-600",
            stage.status === "current" &&
              "bg-[image:var(--brand-gradient)] text-white shadow-[0_0_0_5px_rgba(20,184,166,0.16)]",
            stage.status === "locked" && "bg-slate-100 text-slate-400"
          )}
        >
          {stage.status === "done" ? (
            <Check className="size-5" aria-hidden="true" />
          ) : (
            index + 1
          )}
        </span>
        {!isLast ? (
          <span
            className={cn(
              "min-h-6 w-[3px] flex-1",
              stage.status === "done" ? "bg-green-300" : "bg-slate-200"
            )}
            aria-hidden="true"
          />
        ) : null}
      </div>
      <div
        className={cn(
          "mb-3 min-w-0 flex-1 rounded-[14px] px-3 py-2.5",
          stage.environment
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.1em] text-teal-700">
              {stage.emoji} {t(stage.campKey)}
            </p>
            <h3
              className={cn(
                "mt-0.5 text-sm font-black tracking-wide",
                stage.titleColor
              )}
            >
              {t(stage.titleKey)}
            </h3>
            <p className="text-xs text-slate-500">{t(stage.subtitleKey)}</p>
          </div>
          {stage.status === "current" ? (
            <Badge className="border border-teal-200 bg-teal-100 text-[10px] text-teal-700">
              {t("learningPath.youAreHere")}
            </Badge>
          ) : stage.status === "done" ? (
            <Badge className="border border-green-200 bg-green-100 text-[10px] text-green-700">
              {t("learningPath.status.completed")}
            </Badge>
          ) : (
            <Lock
              className="size-4 text-slate-400"
              aria-label={t("learningPath.status.locked")}
            />
          )}
        </div>
        {stage.nodes.map((node) => (
          <AssignmentCard key={node.assignment_id} node={node} />
        ))}
        {stage.nodes.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white/60 px-3 py-2 text-xs text-slate-500">
            {stage.status === "locked"
              ? t("learningPath.stageLocked")
              : t("learningPath.noStageAssignments")}
          </p>
        ) : null}
      </div>
    </motion.div>
  );
};

const StageDetail = ({ stage }: { stage: BloomStage }) => {
  const { t } = useTranslation("student");
  const completed = stage.nodes.filter(
    (node) => node.status === "graded"
  ).length;
  const available = stage.nodes.find(
    (node) => node.status === "available" || node.status === "submitted"
  );

  return (
    <PCard className="sticky top-[calc(var(--app-header-h)+1.25rem)] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">
        {t("learningPath.levelDetail")}
      </p>
      <div className="mt-3 flex items-start gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-[image:var(--brand-gradient)] text-2xl text-white">
          {stage.emoji}
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-black tracking-tight text-slate-900">
            {t(stage.titleKey)}
          </h2>
          <p className="text-xs text-slate-500">{t(stage.subtitleKey)}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
            {t("learningPath.mastery")}
          </p>
          <p className="mt-1 text-xl font-black text-teal-700">
            {stage.attainment}%
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
            {t("learningPath.tasks")}
          </p>
          <p className="mt-1 text-xl font-black text-slate-800">
            {completed}/{stage.nodes.length}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <p className="text-xs font-black text-slate-800">
          {t("learningPath.milestones")}
        </p>
        <div className="mt-2 space-y-2">
          {stage.nodes.length > 0 ? (
            stage.nodes.map((node) => (
              <div
                key={node.assignment_id}
                className="flex items-center gap-2 text-xs"
              >
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full",
                    node.status === "graded"
                      ? "bg-green-500 text-white"
                      : node.status === "locked"
                      ? "bg-slate-100 text-slate-400"
                      : "border-2 border-teal-500 bg-teal-50 text-teal-700"
                  )}
                >
                  {node.status === "graded" ? (
                    <Check className="size-3" aria-hidden="true" />
                  ) : node.status === "locked" ? (
                    <Lock className="size-2.5" aria-hidden="true" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-teal-500" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold text-slate-600">
                  {node.title}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">
              {t("learningPath.noStageAssignments")}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-blue-50 p-4">
        <div className="flex items-center gap-2 text-xs font-black text-teal-700">
          <Sparkles className="size-4" aria-hidden="true" />
          {t("learningPath.coachTip")}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          {available
            ? t("learningPath.coachContinue", { title: available.title })
            : stage.status === "done"
            ? t("learningPath.coachComplete")
            : t("learningPath.coachLocked")}
        </p>
      </div>
    </PCard>
  );
};

const JourneyView = ({ stages }: { stages: BloomStage[] }) => {
  const { t } = useTranslation("student");
  const activeIndex = stages.findIndex((stage) => stage.status === "current");
  const lastDoneIndex = stages.map((stage) => stage.status).lastIndexOf("done");
  const currentIndex = Math.max(
    0,
    activeIndex >= 0 ? activeIndex : lastDoneIndex
  );
  const currentStage = stages[currentIndex] ?? stages[0];
  const unlockProgress = Math.min(currentStage?.attainment ?? 0, 100);
  const recentNodes = stages
    .flatMap((stage) => stage.nodes)
    .filter((node) => node.status === "graded" || node.status === "submitted")
    .slice(0, 3);

  if (!currentStage) return null;

  return (
    <div className="grid items-start gap-7 min-[1050px]:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0">
        <p className="mb-4 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
          🏔️ {t("learningPath.bloomJourney")}
        </p>
        <PCard className="p-4 sm:p-5">
          {stages.map((stage, index) => (
            <JourneyStage
              key={stage.key}
              stage={stage}
              index={index}
              isLast={index === stages.length - 1}
            />
          ))}
        </PCard>

        <PCard className="mt-4 flex items-center gap-3 p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
            <Lock className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-700">
              {t("learningPath.unlockNext", { percent: 70 })}
            </p>
            <PathProgress value={unlockProgress} className="mt-2 h-2" />
          </div>
          <span className="shrink-0 text-sm font-black text-slate-500">
            {unlockProgress}%
          </span>
        </PCard>

        <PCard className="mt-4 p-4">
          <div className="flex items-center gap-2">
            <Clock3 className="size-4 text-teal-600" aria-hidden="true" />
            <h2 className="text-sm font-black text-slate-900">
              {t("learningPath.recentActivity")}
            </h2>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {recentNodes.length > 0 ? (
              recentNodes.map((node) => (
                <div
                  key={node.assignment_id}
                  className="flex items-center gap-3 py-3"
                >
                  <CheckCircle2
                    className="size-4 shrink-0 text-green-500"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-600">
                    {node.title}
                  </span>
                  <NodeStatusBadge status={node.status} />
                </div>
              ))
            ) : (
              <p className="py-4 text-xs text-slate-500">
                {t("learningPath.noRecentActivity")}
              </p>
            )}
          </div>
        </PCard>
      </div>
      <StageDetail stage={currentStage} />
    </div>
  );
};

const KnowledgeTreeView = ({ stages }: { stages: BloomStage[] }) => {
  const { t } = useTranslation("student");
  const overall = averagePercentage(
    stages.flatMap((stage) => (stage.attainment > 0 ? [stage.attainment] : []))
  );

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-black tracking-tight text-slate-900">
          {t("learningPath.tree.title")}
        </h2>
        <p className="text-xs text-slate-500">
          {t("learningPath.tree.subtitle")}
        </p>
      </div>
      <div className="grid items-start gap-7 min-[1050px]:grid-cols-[minmax(0,1fr)_400px]">
        <PCard className="p-2">
          <div className="relative min-h-[560px] overflow-hidden rounded-[18px] bg-[radial-gradient(120%_85%_at_50%_100%,#dcfce7_0%,#ecfdf5_38%,#f0fdfa_66%,#ffffff_90%)]">
            <svg
              className="absolute inset-0 size-full"
              viewBox="0 0 400 560"
              preserveAspectRatio="none"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M200 530 L200 55"
                stroke="#86efac"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <path
                d="M200 530 L200 55"
                stroke="#4ade80"
                strokeWidth="5"
                strokeLinecap="round"
                opacity=".75"
              />
              <path
                d="M200 380 C145 330 120 285 126 220"
                stroke="#86efac"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M200 345 C250 300 275 250 270 165"
                stroke="#86efac"
                strokeWidth="10"
                strokeLinecap="round"
              />
            </svg>
            {stages.map((stage, index) => (
              <div
                key={stage.key}
                className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center"
                style={TREE_POSITIONS[index]}
              >
                <div
                  className={cn(
                    "relative flex size-[74px] flex-col items-center justify-center rounded-full border-[3px] border-white text-white shadow-[0_12px_26px_rgba(16,24,40,0.18)]",
                    stage.status === "done" &&
                      "bg-gradient-to-br from-green-400 to-green-600",
                    stage.status === "current" &&
                      "bg-gradient-to-br from-teal-400 to-teal-600",
                    stage.status === "locked" &&
                      "bg-gradient-to-br from-slate-300 to-slate-400"
                  )}
                >
                  <span className="text-base font-black">
                    {stage.status === "locked"
                      ? stage.emoji
                      : `${stage.attainment}%`}
                  </span>
                  {stage.status === "locked" ? (
                    <span className="absolute -end-1 -top-1 flex size-6 items-center justify-center rounded-full bg-white text-slate-400 shadow">
                      <Lock className="size-3" aria-hidden="true" />
                    </span>
                  ) : null}
                </div>
                <span className="mt-1.5 whitespace-nowrap text-[11px] font-black text-slate-700">
                  {t(stage.titleKey)}
                </span>
              </div>
            ))}
          </div>
        </PCard>

        <PCard className="sticky top-[calc(var(--app-header-h)+1.25rem)] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">
            {t("learningPath.tree.overallMastery")}
          </p>
          <p className="mt-1 text-4xl font-black text-green-600">{overall}%</p>
          <p className="mt-1 text-xs font-bold text-teal-600">
            🌱 {t("learningPath.tree.keepGrowing")}
          </p>
          <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
            {MASTERY_LEGEND.map((item) => (
              <div
                key={item.labelKey}
                className="flex items-center gap-2 text-xs text-slate-600"
              >
                <span className={cn("size-3 rounded", item.color)} />
                <span className="font-semibold">{t(item.labelKey)}</span>
                <span className="ms-auto font-semibold text-slate-400">
                  {item.range}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-blue-50 p-4">
            <div className="flex items-center gap-2 text-xs font-black text-teal-700">
              <TreePine className="size-4" aria-hidden="true" />
              {t("learningPath.coachTip")}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {t("learningPath.tree.tip")}
            </p>
          </div>
        </PCard>
      </div>
      <PCard className="mt-4 flex items-center gap-3 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <Mountain
          className="size-5 shrink-0 text-green-700"
          aria-hidden="true"
        />
        <p className="text-xs font-semibold leading-relaxed text-green-700">
          {t("learningPath.tree.strength")}
        </p>
      </PCard>
    </div>
  );
};

export interface LearningPathProps {
  courseId: string;
  studentId: string;
}

const LearningPath = ({ courseId, studentId }: LearningPathProps) => {
  const { t } = useTranslation("student");
  const [view, setView] = useState<PathView>("journey");
  const { data: nodes, isLoading } = useLearningPath(courseId, studentId);
  const stages = useMemo(() => buildPresentedStages(nodes ?? []), [nodes]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Shimmer className="h-11 w-64 rounded-xl" />
        <div className="grid gap-7 min-[1050px]:grid-cols-[minmax(0,1fr)_400px]">
          <Shimmer className="h-[620px] rounded-[20px]" />
          <Shimmer className="h-[420px] rounded-[20px]" />
        </div>
      </div>
    );
  }

  if (!nodes || nodes.length === 0) {
    return (
      <PCard className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <GitBranch className="size-7" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-base font-black text-slate-900">
          {t("learningPath.emptyTitle")}
        </h2>
        <p className="mt-1 max-w-md text-sm text-slate-500">
          {t("learningPath.emptyDescription")}
        </p>
      </PCard>
    );
  }

  return (
    <div>
      <div className="mb-[18px] inline-flex gap-1 rounded-[14px] border border-slate-200 bg-white p-1 shadow-sm">
        <Button
          type="button"
          size="sm"
          variant={view === "journey" ? "default" : "ghost"}
          className={cn(
            "rounded-[10px] px-4 font-black",
            view === "journey" && "bg-[image:var(--brand-gradient)] text-white"
          )}
          onClick={() => setView("journey")}
          aria-pressed={view === "journey"}
        >
          <MapIcon className="size-4" aria-hidden="true" />
          {t("learningPath.views.journey")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "tree" ? "default" : "ghost"}
          className={cn(
            "rounded-[10px] px-4 font-black",
            view === "tree" && "bg-[image:var(--brand-gradient)] text-white"
          )}
          onClick={() => setView("tree")}
          aria-pressed={view === "tree"}
        >
          <TreePine className="size-4" aria-hidden="true" />
          {t("learningPath.views.tree")}
        </Button>
      </div>
      {view === "journey" ? (
        <JourneyView stages={stages} />
      ) : (
        <KnowledgeTreeView stages={stages} />
      )}
    </div>
  );
};

export default LearningPath;
