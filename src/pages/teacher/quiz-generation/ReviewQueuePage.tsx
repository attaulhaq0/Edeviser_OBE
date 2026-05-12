import { useParams } from "react-router-dom";
import { Check, X, CheckCheck, Inbox } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import QuestionPreview from "@/components/shared/QuestionPreview";
import DifficultyBadge from "@/components/shared/DifficultyBadge";
import Shimmer from "@/components/shared/Shimmer";

import {
  useReviewQueue,
  useApproveQuestion,
  useRejectQuestion,
  useBulkApproveQuestions,
} from "@/hooks/useReviewQueue";
import { useCLOs } from "@/hooks/useCLOs";
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

// ─── Grouping helper ────────────────────────────────────────────────────────

interface GroupedQuestions {
  cloId: string;
  cloTitle: string;
  bloomLevel: number;
  questions: QuestionBankRow[];
}

const groupQuestions = (
  questions: QuestionBankRow[],
  cloMap: Record<string, string>
): GroupedQuestions[] => {
  const map = new Map<string, GroupedQuestions>();

  for (const q of questions) {
    const key = `${q.clo_id}::${q.bloom_level}`;
    if (!map.has(key)) {
      map.set(key, {
        cloId: q.clo_id,
        cloTitle: cloMap[q.clo_id] ?? "Unknown CLO",
        bloomLevel: q.bloom_level,
        questions: [],
      });
    }
    map.get(key)!.questions.push(q);
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      a.cloTitle.localeCompare(b.cloTitle) || a.bloomLevel - b.bloomLevel
  );
};

// ─── Source chunk type ──────────────────────────────────────────────────────

interface SourceChunk {
  chunk_text?: string;
  source_filename?: string;
}

// ─── Page Component ─────────────────────────────────────────────────────────

const ReviewQueuePage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { data: questions, isLoading } = useReviewQueue(courseId ?? "");
  const closQuery = useCLOs(courseId);
  const approveMutation = useApproveQuestion();
  const rejectMutation = useRejectQuestion();
  const bulkApproveMutation = useBulkApproveQuestions();

  const clos = closQuery.data?.data ?? [];
  const cloMap: Record<string, string> = {};
  for (const clo of clos) {
    cloMap[clo.id] = clo.title;
  }

  const pendingQuestions = questions ?? [];
  const totalCount = pendingQuestions.length;
  const approvedCount = 0; // All items in the review queue are pending; approval rate is tracked across all generated
  const approvalRate =
    totalCount > 0 ? `${approvedCount} / ${totalCount}` : "0 / 0";

  const groups = groupQuestions(pendingQuestions, cloMap);

  const handleApprove = (id: string) => {
    approveMutation.mutate(
      { id },
      {
        onSuccess: () => toast.success("Question approved"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleReject = (id: string) => {
    rejectMutation.mutate(
      { id },
      {
        onSuccess: () => toast.success("Question rejected"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleBulkApprove = () => {
    const ids = pendingQuestions.map((q) => q.id);
    if (ids.length === 0) return;

    bulkApproveMutation.mutate(
      { ids },
      {
        onSuccess: (data) => toast.success(`Approved ${data.length} questions`),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  // ─── Loading state ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Shimmer className="h-10 w-64" />
        <Shimmer className="h-48" />
        <Shimmer className="h-48" />
      </div>
    );
  }

  // ─── Empty state ────────────────────────────────────────────────────────

  if (totalCount === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
        <Card className="bg-white border-0 shadow-md rounded-xl p-12 flex flex-col items-center justify-center gap-3">
          <Inbox className="h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">
            No pending questions to review.
          </p>
        </Card>
      </div>
    );
  }

  // ─── Main render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
          <p className="text-sm text-gray-500 mt-1">
            Approval rate: {approvalRate} pending
          </p>
        </div>
        <Button
          onClick={handleBulkApprove}
          disabled={bulkApproveMutation.isPending}
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 transition-transform"
        >
          <CheckCheck className="h-4 w-4" />
          {bulkApproveMutation.isPending ? "Approving..." : "Approve All"}
        </Button>
      </div>

      {/* Grouped questions */}
      {groups.map((group) => (
        <div key={`${group.cloId}-${group.bloomLevel}`} className="space-y-3">
          {/* Group header */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
            <div
              className="px-6 py-3 flex items-center gap-3"
              style={{
                background: "var(--brand-gradient)",
              }}
            >
              <h2 className="text-sm font-bold tracking-tight text-white flex-1">
                {group.cloTitle}
              </h2>
              <Badge
                className={`${
                  BLOOM_COLORS[group.bloomLevel] ?? ""
                } text-xs font-bold tracking-wide uppercase border-transparent`}
              >
                {BLOOM_LABELS[group.bloomLevel] ?? `Level ${group.bloomLevel}`}
              </Badge>
              <span className="text-xs text-white/70 font-medium">
                {group.questions.length} question
                {group.questions.length !== 1 ? "s" : ""}
              </span>
            </div>
          </Card>

          {/* Question cards */}
          {group.questions.map((question) => (
            <QuestionReviewCard
              key={question.id}
              question={question}
              onApprove={handleApprove}
              onReject={handleReject}
              isApproving={approveMutation.isPending}
              isRejecting={rejectMutation.isPending}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// ─── Question Review Card ───────────────────────────────────────────────────

interface QuestionReviewCardProps {
  question: QuestionBankRow;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}

const QuestionReviewCard = ({
  question,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: QuestionReviewCardProps) => {
  const chunks = Array.isArray(question.source_chunks)
    ? (question.source_chunks as SourceChunk[])
    : [];
  const firstChunk = chunks[0];

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
      <div className="p-4 space-y-3">
        {/* Question preview */}
        <QuestionPreview
          questionText={question.question_text}
          questionType={
            question.question_type as
              | "mcq"
              | "true_false"
              | "short_answer"
              | "fill_in_blank"
          }
          options={
            Array.isArray(question.options)
              ? (question.options as { key: string; text: string }[])
              : null
          }
          disabled
        />

        {/* Badges row */}
        <div className="flex items-center gap-2 flex-wrap">
          <DifficultyBadge difficulty={question.difficulty_rating} />
          <Badge
            className={`${
              BLOOM_COLORS[question.bloom_level] ?? ""
            } text-xs font-bold tracking-wide uppercase border-transparent`}
          >
            {BLOOM_LABELS[question.bloom_level] ??
              `Level ${question.bloom_level}`}
          </Badge>
        </div>

        {/* Source material excerpt */}
        {firstChunk?.chunk_text && (
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-[10px] font-black tracking-widest uppercase text-gray-400 mb-1">
              Source Material
            </p>
            <p className="text-xs text-gray-600 line-clamp-3">
              {firstChunk.chunk_text}
            </p>
            {firstChunk.source_filename && (
              <p className="text-[10px] text-gray-400 mt-1">
                {firstChunk.source_filename}
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            disabled={isApproving}
            onClick={() => onApprove(question.id)}
            className="text-green-700 border-green-300 hover:bg-green-50"
          >
            <Check className="h-4 w-4" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isRejecting}
            onClick={() => onReject(question.id)}
            className="text-red-700 border-red-300 hover:bg-red-50"
          >
            <X className="h-4 w-4" />
            Reject
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ReviewQueuePage;
