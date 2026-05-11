import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import DifficultyBadge from "@/components/shared/DifficultyBadge";
import QuestionQualityIndicator from "@/components/shared/QuestionQualityIndicator";
import type { QuestionAnalyticsRow } from "@/hooks/useQuestionAnalytics";

// ─── Bloom's level helpers ──────────────────────────────────────────────────

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

const TYPE_LABELS: Record<string, string> = {
  mcq: "MCQ",
  true_false: "T/F",
  short_answer: "Short",
  fill_in_blank: "Fill-in",
};

// ─── Column definitions ─────────────────────────────────────────────────────

export const createAnalyticsColumns = (
  onRowClick: (row: QuestionAnalyticsRow) => void
): ColumnDef<QuestionAnalyticsRow>[] => [
  {
    id: "question_text",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ms-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Question
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
    accessorFn: (row) => row.question_bank.question_text,
    cell: ({ row }) => {
      const text = row.original.question_bank.question_text;
      const isFlagged =
        row.original.quality_flag !== null &&
        row.original.quality_flag !== "good";
      return (
        <button
          type="button"
          className={cn(
            "text-start font-medium text-sm hover:underline",
            isFlagged && "cursor-pointer text-blue-600"
          )}
          onClick={() => isFlagged && onRowClick(row.original)}
        >
          {text.length > 60 ? `${text.slice(0, 60)}…` : text}
        </button>
      );
    },
  },
  {
    id: "clo",
    header: "CLO",
    accessorFn: (row) => row.question_bank.clo_id,
    cell: ({ row }) => (
      <span className="text-sm text-gray-600 max-w-[120px] truncate inline-block">
        {row.original.question_bank.clo_id.slice(0, 8)}
      </span>
    ),
  },
  {
    id: "bloom_level",
    header: "Bloom's",
    accessorFn: (row) => row.question_bank.bloom_level,
    cell: ({ row }) => {
      const level = row.original.question_bank.bloom_level;
      return (
        <Badge
          className={cn(
            "text-xs font-bold tracking-wide uppercase border-transparent",
            BLOOM_COLORS[level] ?? "bg-gray-200 text-gray-700"
          )}
        >
          {BLOOM_LABELS[level] ?? `L${level}`}
        </Badge>
      );
    },
  },
  {
    id: "question_type",
    header: "Type",
    accessorFn: (row) => row.question_bank.question_type,
    cell: ({ row }) => {
      const type = row.original.question_bank.question_type;
      return (
        <span className="text-sm text-gray-600">
          {TYPE_LABELS[type] ?? type}
        </span>
      );
    },
  },
  {
    accessorKey: "success_rate",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ms-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Success %
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const rate = row.getValue("success_rate") as number;
      return (
        <span className="text-sm font-medium">{(rate * 100).toFixed(1)}%</span>
      );
    },
  },
  {
    accessorKey: "avg_response_time_seconds",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ms-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Avg Time (s)
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const time = row.getValue("avg_response_time_seconds") as number;
      return <span className="text-sm">{time.toFixed(1)}s</span>;
    },
  },
  {
    accessorKey: "discrimination_index",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ms-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Discrim.
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const di = row.getValue("discrimination_index") as number;
      return <span className="text-sm">{di.toFixed(2)}</span>;
    },
  },
  {
    accessorKey: "total_attempts",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ms-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Attempts
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-sm">
        {row.getValue("total_attempts") as number}
      </span>
    ),
  },
  {
    id: "difficulty",
    header: "Difficulty",
    cell: ({ row }) => {
      const calibrated = row.original.calibrated_difficulty;
      const original = row.original.question_bank.difficulty_rating;
      return <DifficultyBadge difficulty={calibrated ?? original} />;
    },
  },
  {
    accessorKey: "quality_flag",
    header: "Quality",
    cell: ({ row }) => {
      const flag = row.getValue("quality_flag") as string | null;
      return (
        <QuestionQualityIndicator
          qualityFlag={
            flag as
              | "good"
              | "low_discrimination"
              | "too_easy"
              | "too_hard"
              | null
          }
        />
      );
    },
  },
];
