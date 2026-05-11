import { useState } from "react";
import { useParams } from "react-router-dom";
import { parseAsString, useQueryState } from "nuqs";
import { BarChart3 } from "lucide-react";

import { cn } from "@/lib/utils";
import { DataTable } from "@/components/shared/DataTable";
import AnswerDistributionChart from "@/components/shared/AnswerDistributionChart";
import QuestionQualityIndicator from "@/components/shared/QuestionQualityIndicator";
import DifficultyBadge from "@/components/shared/DifficultyBadge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

import {
  useQuestionAnalytics,
  type QuestionAnalyticsRow,
} from "@/hooks/useQuestionAnalytics";
import { useCLOs } from "@/hooks/useCLOs";
import { createAnalyticsColumns } from "./columns";
import EmptyState from "@/components/shared/EmptyState";

// ─── Constants ──────────────────────────────────────────────────────────────

const BLOOM_OPTIONS = [
  { value: "1", label: "Remember" },
  { value: "2", label: "Understand" },
  { value: "3", label: "Apply" },
  { value: "4", label: "Analyze" },
  { value: "5", label: "Evaluate" },
  { value: "6", label: "Create" },
];

const BLOOM_LABELS: Record<number, string> = {
  1: "Remember",
  2: "Understand",
  3: "Apply",
  4: "Analyze",
  5: "Evaluate",
  6: "Create",
};

const BLOOM_COLORS: Record<number, string> = {
  1: "bg-purple-500 text-white",
  2: "bg-blue-500 text-white",
  3: "bg-green-500 text-white",
  4: "bg-yellow-500 text-gray-900",
  5: "bg-orange-500 text-white",
  6: "bg-red-500 text-white",
};

const QUALITY_OPTIONS = [
  { value: "good", label: "Good" },
  { value: "low_discrimination", label: "Low Discrimination" },
  { value: "too_easy", label: "Too Easy" },
  { value: "too_hard", label: "Too Hard" },
];

// Mock answer distribution data for the detail panel
const MOCK_ANSWER_DISTRIBUTION = [
  { option: "A", count: 42, isCorrect: true },
  { option: "B", count: 18, isCorrect: false },
  { option: "C", count: 27, isCorrect: false },
  { option: "D", count: 13, isCorrect: false },
];

// ─── Suggested action helper ────────────────────────────────────────────────

const getSuggestedAction = (
  flag: string | null
): { label: string; description: string } => {
  switch (flag) {
    case "too_easy":
      return {
        label: "Increase Difficulty",
        description:
          "This question is answered correctly by >95% of students. Consider adding more challenging distractors or replacing it with a higher Bloom's level question.",
      };
    case "too_hard":
      return {
        label: "Simplify or Replace",
        description:
          "This question has a success rate below 10%. Review the question text for clarity, check distractors for ambiguity, or replace with a lower difficulty question.",
      };
    case "low_discrimination":
      return {
        label: "Review Distractors",
        description:
          "This question does not differentiate well between high and low performers. Revise distractors to target common misconceptions more effectively.",
      };
    default:
      return {
        label: "No Action Needed",
        description: "This question is performing well across all metrics.",
      };
  }
};

// ─── Page Component ─────────────────────────────────────────────────────────

const QuestionAnalyticsDashboard = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [selectedQuestion, setSelectedQuestion] =
    useState<QuestionAnalyticsRow | null>(null);

  // URL-persisted filter state
  const [cloFilter, setCloFilter] = useQueryState(
    "clo",
    parseAsString.withDefault("")
  );
  const [bloomFilter, setBloomFilter] = useQueryState(
    "bloom",
    parseAsString.withDefault("")
  );
  const [qualityFilter, setQualityFilter] = useQueryState(
    "quality",
    parseAsString.withDefault("")
  );

  // Data fetching
  const { data: analyticsRows, isLoading } = useQuestionAnalytics(
    courseId ?? "",
    {
      clo_id: cloFilter || undefined,
      bloom_level: bloomFilter ? Number(bloomFilter) : undefined,
      quality_flag: qualityFilter || undefined,
    }
  );

  const closQuery = useCLOs(courseId);
  const clos = closQuery.data?.data ?? [];

  const columns = createAnalyticsColumns(setSelectedQuestion);

  const selected = selectedQuestion;
  const suggestedAction = selected
    ? getSuggestedAction(selected.quality_flag)
    : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold tracking-tight">
          Question Analytics
        </h1>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={cloFilter}
          onValueChange={(val) => setCloFilter(val === "all" ? "" : val)}
        >
          <SelectTrigger className="w-[200px] bg-white">
            <SelectValue placeholder="All CLOs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All CLOs</SelectItem>
            {clos.map((clo) => (
              <SelectItem key={clo.id} value={clo.id}>
                {clo.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={bloomFilter}
          onValueChange={(val) => setBloomFilter(val === "all" ? "" : val)}
        >
          <SelectTrigger className="w-[160px] bg-white">
            <SelectValue placeholder="Bloom's Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {BLOOM_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={qualityFilter}
          onValueChange={(val) => setQualityFilter(val === "all" ? "" : val)}
        >
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Quality Flag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Quality</SelectItem>
            {QUALITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={analyticsRows ?? []}
        isLoading={isLoading}
        emptyState={
          (analyticsRows ?? []).length === 0 && !isLoading ? (
            <EmptyState
              icon={<BarChart3 className="h-8 w-8 text-gray-400" />}
              title="No analytics data"
              description="No question analytics found for the selected filters. Try adjusting the filters or run a quiz to generate data."
            />
          ) : undefined
        }
      />

      {/* Flagged Question Detail Panel */}
      <Sheet
        open={!!selected}
        onOpenChange={(open) => !open && setSelectedQuestion(null)}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg overflow-y-auto"
        >
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Question Detail</SheetTitle>
                <SheetDescription>
                  Analytics and suggested actions for this flagged question.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 px-4 pb-6">
                {/* Full question text */}
                <Card className="bg-white border-0 shadow-md rounded-xl p-4">
                  <p className="text-sm font-medium leading-relaxed">
                    {selected.question_bank.question_text}
                  </p>
                </Card>

                {/* Metrics grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                      Success Rate
                    </p>
                    <p className="text-lg font-bold">
                      {(selected.success_rate * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                      Avg Response Time
                    </p>
                    <p className="text-lg font-bold">
                      {selected.avg_response_time_seconds.toFixed(1)}s
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                      Discrimination Index
                    </p>
                    <p className="text-lg font-bold">
                      {selected.discrimination_index.toFixed(3)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                      Total Attempts
                    </p>
                    <p className="text-lg font-bold">
                      {selected.total_attempts}
                    </p>
                  </div>
                </div>

                {/* Badges row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    className={cn(
                      "text-xs font-bold tracking-wide uppercase border-transparent",
                      BLOOM_COLORS[selected.question_bank.bloom_level] ??
                        "bg-gray-200 text-gray-700"
                    )}
                  >
                    {BLOOM_LABELS[selected.question_bank.bloom_level] ??
                      `L${selected.question_bank.bloom_level}`}
                  </Badge>
                  <DifficultyBadge
                    difficulty={
                      selected.calibrated_difficulty ??
                      selected.question_bank.difficulty_rating
                    }
                  />
                  <QuestionQualityIndicator
                    qualityFlag={
                      selected.quality_flag as
                        | "good"
                        | "low_discrimination"
                        | "too_easy"
                        | "too_hard"
                        | null
                    }
                  />
                </div>

                {/* Answer Distribution Chart */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                    Answer Distribution
                  </p>
                  <AnswerDistributionChart data={MOCK_ANSWER_DISTRIBUTION} />
                </div>

                {/* Suggested Action */}
                {suggestedAction && (
                  <Card className="bg-white border-0 shadow-md rounded-xl p-4 space-y-2">
                    <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                      Suggested Action
                    </p>
                    <p className="text-sm font-bold text-blue-600">
                      {suggestedAction.label}
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {suggestedAction.description}
                    </p>
                  </Card>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default QuestionAnalyticsDashboard;
