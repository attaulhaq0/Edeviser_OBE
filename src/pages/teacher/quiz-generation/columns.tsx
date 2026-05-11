import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import DifficultyBadge from "@/components/shared/DifficultyBadge";
import QuestionQualityIndicator from "@/components/shared/QuestionQualityIndicator";
import ExplanationConfidenceBadge from "@/components/shared/ExplanationConfidenceBadge";
import type { QuestionBankRow } from "@/hooks/useQuestionBank";

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

// ─── Status badge styles ────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  pending_review: "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  pending_review: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

// ─── Source labels ──────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  ai: "AI",
  ai_edited: "AI Edited",
  manual: "Manual",
};

// ─── Type labels ────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  mcq: "MCQ",
  true_false: "T/F",
  short_answer: "Short",
  fill_in_blank: "Fill-in",
};

// ─── Analytics type for joined data ─────────────────────────────────────────

export interface QuestionWithAnalytics extends QuestionBankRow {
  analytics?: {
    quality_flag:
      | "good"
      | "low_discrimination"
      | "too_easy"
      | "too_hard"
      | null;
  } | null;
  clo_title?: string;
  explanation_confidence?: number | null;
}

// ─── Column definitions ─────────────────────────────────────────────────────

export const createColumns = (): ColumnDef<QuestionWithAnalytics>[] => [
  {
    accessorKey: "question_text",
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
    cell: ({ row }) => {
      const text = row.getValue("question_text") as string;
      return (
        <span className="font-medium text-sm" title={text}>
          {text.length > 80 ? `${text.slice(0, 80)}…` : text}
        </span>
      );
    },
  },
  {
    id: "clo",
    header: "CLO",
    cell: ({ row }) => (
      <span
        className="text-sm text-gray-600 max-w-[140px] truncate inline-block"
        title={row.original.clo_title}
      >
        {row.original.clo_title ?? row.original.clo_id.slice(0, 8)}
      </span>
    ),
  },
  {
    accessorKey: "bloom_level",
    header: "Bloom's",
    cell: ({ row }) => {
      const level = row.getValue("bloom_level") as number;
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
    accessorKey: "question_type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.getValue("question_type") as string;
      return (
        <span className="text-sm text-gray-600">
          {TYPE_LABELS[type] ?? type}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge
          variant="outline"
          className={cn(
            "text-xs font-bold tracking-wide",
            STATUS_STYLES[status] ?? ""
          )}
        >
          {STATUS_LABELS[status] ?? status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "difficulty_rating",
    header: "Difficulty",
    cell: ({ row }) => (
      <DifficultyBadge
        difficulty={row.getValue("difficulty_rating") as number}
      />
    ),
  },
  {
    id: "quality",
    header: "Quality",
    cell: ({ row }) => {
      const analytics = row.original.analytics;
      if (!analytics) return <span className="text-xs text-gray-400">—</span>;
      return <QuestionQualityIndicator qualityFlag={analytics.quality_flag} />;
    },
  },
  {
    id: "explanation",
    header: "Explanation",
    cell: ({ row }) => (
      <ExplanationConfidenceBadge
        confidence={row.original.explanation_confidence ?? null}
        isVerified={false}
      />
    ),
  },
  {
    accessorKey: "generation_source",
    header: "Source",
    cell: ({ row }) => {
      const source = row.getValue("generation_source") as string;
      return (
        <span className="text-xs text-gray-500">
          {SOURCE_LABELS[source] ?? source}
        </span>
      );
    },
  },
];
