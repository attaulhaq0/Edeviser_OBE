import { useParams } from "react-router-dom";
import { parseAsString, useQueryState } from "nuqs";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useQuestionBank } from "@/hooks/useQuestionBank";
import { useQuestionAnalytics } from "@/hooks/useQuestionAnalytics";
import { useCLOs } from "@/hooks/useCLOs";
import { createColumns, type QuestionWithAnalytics } from "./columns";
import { NoQuestions } from "@/components/shared/EmptyState";

// ─── Bloom's filter options ─────────────────────────────────────────────────

const BLOOM_OPTIONS = [
  { value: "1", label: "Remember" },
  { value: "2", label: "Understand" },
  { value: "3", label: "Apply" },
  { value: "4", label: "Analyze" },
  { value: "5", label: "Evaluate" },
  { value: "6", label: "Create" },
];

const TYPE_OPTIONS = [
  { value: "mcq", label: "MCQ" },
  { value: "true_false", label: "True/False" },
  { value: "short_answer", label: "Short Answer" },
  { value: "fill_in_blank", label: "Fill-in-Blank" },
];

const STATUS_OPTIONS = [
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const SOURCE_OPTIONS = [
  { value: "ai", label: "AI Generated" },
  { value: "ai_edited", label: "AI Edited" },
  { value: "manual", label: "Manual" },
];

// ─── Page Component ─────────────────────────────────────────────────────────

const QuestionBankPage = () => {
  const { courseId } = useParams<{ courseId: string }>();

  // URL-persisted filter state
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [cloFilter, setCloFilter] = useQueryState(
    "clo",
    parseAsString.withDefault("")
  );
  const [bloomFilter, setBloomFilter] = useQueryState(
    "bloom",
    parseAsString.withDefault("")
  );
  const [typeFilter, setTypeFilter] = useQueryState(
    "type",
    parseAsString.withDefault("")
  );
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsString.withDefault("")
  );
  const [sourceFilter, setSourceFilter] = useQueryState(
    "source",
    parseAsString.withDefault("")
  );

  // Data fetching
  const { data: questions, isLoading } = useQuestionBank(courseId ?? "", {
    search: search || undefined,
    clo_id: cloFilter || undefined,
    bloom_level: bloomFilter ? Number(bloomFilter) : undefined,
    question_type: typeFilter || undefined,
    status: statusFilter || undefined,
    generation_source: sourceFilter || undefined,
  });

  const { data: analyticsRows } = useQuestionAnalytics(courseId ?? "");
  const closQuery = useCLOs(courseId);
  const clos = closQuery.data?.data ?? [];

  // Build CLO title lookup
  const cloMap: Record<string, string> = {};
  for (const clo of clos) {
    cloMap[clo.id] = clo.title;
  }

  // Build analytics lookup by question_id
  const analyticsMap: Record<
    string,
    {
      quality_flag:
        | "good"
        | "low_discrimination"
        | "too_easy"
        | "too_hard"
        | null;
    }
  > = {};
  for (const row of analyticsRows ?? []) {
    analyticsMap[row.question_id] = {
      quality_flag: row.quality_flag as
        | "good"
        | "low_discrimination"
        | "too_easy"
        | "too_hard"
        | null,
    };
  }

  // Merge questions with analytics and CLO titles
  const enrichedData: QuestionWithAnalytics[] = (questions ?? []).map((q) => ({
    ...q,
    clo_title: cloMap[q.clo_id],
    analytics: analyticsMap[q.id] ?? null,
  }));

  const columns = createColumns();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Question Bank</h1>
        <Button
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
          onClick={() => toast.info("Manual question creation coming soon")}
        >
          <Plus className="h-4 w-4" /> Add Question
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>

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
          value={typeFilter}
          onValueChange={(val) => setTypeFilter(val === "all" ? "" : val)}
        >
          <SelectTrigger className="w-[160px] bg-white">
            <SelectValue placeholder="Question Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}
        >
          <SelectTrigger className="w-[160px] bg-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sourceFilter}
          onValueChange={(val) => setSourceFilter(val === "all" ? "" : val)}
        >
          <SelectTrigger className="w-[160px] bg-white">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {SOURCE_OPTIONS.map((opt) => (
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
        data={enrichedData}
        isLoading={isLoading}
        emptyState={
          enrichedData.length === 0 && !isLoading ? <NoQuestions /> : undefined
        }
      />
    </div>
  );
};

export default QuestionBankPage;
