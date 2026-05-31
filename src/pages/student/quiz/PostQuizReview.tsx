import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowLeft,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { computePerCLOScore } from "@/lib/questionAnalytics";
import { useQuizReview, type ReviewQuestion } from "@/hooks/useQuizReview";
import QuestionPreview from "@/components/shared/QuestionPreview";
import ExplanationConfidenceBadge from "@/components/shared/ExplanationConfidenceBadge";
import { InlineNoCLOs } from "@/components/shared/EmptyState";
import {
  useVerifiedExplanation,
  useExplanationConfidence,
} from "@/hooks/useExplanationConfidence";
import { BloomsProgressionLadder } from "@/components/shared/BloomsProgressionLadder";
import { useBloomsClimbState } from "@/hooks/useBloomsProgression";

// ─── Bloom's level helpers ────────────────────────────────────────────────────

const BLOOM_LABEL_KEYS: Record<number, string> = {
  1: "blooms.remembering",
  2: "blooms.understanding",
  3: "blooms.applying",
  4: "blooms.analyzing",
  5: "blooms.evaluating",
  6: "blooms.creating",
};

const BLOOM_BADGE_COLORS: Record<number, string> = {
  1: "bg-purple-500 text-white",
  2: "bg-blue-500 text-white",
  3: "bg-green-500 text-white",
  4: "bg-yellow-500 text-gray-900",
  5: "bg-orange-500 text-white",
  6: "bg-red-500 text-white",
};

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Attainment color helper ──────────────────────────────────────────────────

const getAttainmentColor = (percent: number): string => {
  if (percent >= 70) return "text-green-700 bg-green-100";
  if (percent >= 50) return "text-yellow-700 bg-yellow-100";
  return "text-red-700 bg-red-100";
};

const getAttainmentBarColor = (percent: number): string => {
  if (percent >= 70) return "bg-green-500";
  if (percent >= 50) return "bg-yellow-500";
  return "bg-red-500";
};

// ─── QuestionExplanation wrapper (uses hooks per question) ────────────────────

interface QuestionExplanationProps {
  questionId: string;
  aiExplanation: string | null;
}

const QuestionExplanation = ({
  questionId,
  aiExplanation,
}: QuestionExplanationProps) => {
  const { t } = useTranslation("student");
  const { data: verifiedExplanation } = useVerifiedExplanation(questionId);
  const { data: confidence } = useExplanationConfidence(questionId);

  const isVerified = !!verifiedExplanation;
  const displayText = isVerified
    ? verifiedExplanation.explanation_text
    : aiExplanation;

  if (!displayText) return null;

  return (
    <div className="bg-blue-50 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-xs font-bold tracking-wide uppercase text-blue-600">
          {isVerified
            ? t("quiz.review.verifiedExplanation")
            : t("quiz.review.aiExplanation")}
        </p>
        <ExplanationConfidenceBadge
          confidence={confidence ?? null}
          isVerified={isVerified}
        />
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{displayText}</p>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const PostQuizReview = () => {
  const { t } = useTranslation("student");
  const { quizId, attemptId } = useParams<{
    quizId: string;
    attemptId: string;
  }>();
  const { data, isLoading, error } = useQuizReview(quizId, attemptId);
  const { data: climbState } = useBloomsClimbState(attemptId ?? "");

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-gray-500">
          {t("quiz.review.loading")}
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <XCircle className="h-8 w-8 text-red-500" />
        <p className="text-sm font-medium text-gray-500">
          {t("quiz.review.loadFailed")}
        </p>
        <Link to="/student/dashboard">
          <Button variant="outline">{t("quiz.review.backToDashboard")}</Button>
        </Link>
      </div>
    );
  }

  const { attempt, questions } = data;

  // Build per-CLO score breakdown
  const answerDetails = questions.map((q: ReviewQuestion) => ({
    clo_id: q.clo_id,
    is_correct: attempt.answers[q.id] === q.correct_answer.value,
  }));
  const perCLOScores = computePerCLOScore(answerDetails);

  // Build CLO title map from questions
  const cloTitleMap = new Map(
    questions.map((q: ReviewQuestion) => [q.clo_id, q.clo_title ?? q.clo_id])
  );

  // Build unique CLO list for Bloom's Progression section
  const uniqueCloIds = [
    ...new Set(questions.map((q: ReviewQuestion) => q.clo_id)),
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("quiz.review.title")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t("quiz.review.overallScore")}{" "}
            <span className="font-bold text-gray-900">{attempt.score}%</span>
          </p>
        </div>
      </div>

      {/* Per-CLO Score Breakdown */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background: "var(--brand-gradient)",
          }}
        >
          <h2 className="text-lg font-bold tracking-tight text-white">
            {t("quiz.review.perCloBreakdown")}
          </h2>
        </div>
        <div className="p-6 space-y-4">
          {Object.entries(perCLOScores).map(([cloId, score]) => (
            <div key={cloId} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 truncate max-w-[70%]">
                  {cloTitleMap.get(cloId) ?? cloId}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-bold border-transparent",
                    getAttainmentColor(score)
                  )}
                >
                  {Math.round(score)}%
                </Badge>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    getAttainmentBarColor(score)
                  )}
                  style={{ width: `${Math.min(score, 100)}%` }}
                />
              </div>
            </div>
          ))}
          {Object.keys(perCLOScores).length === 0 && <InlineNoCLOs />}
        </div>
      </Card>

      {/* Bloom's Progression */}
      {climbState && uniqueCloIds.length > 0 && (
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{
              background: "var(--brand-gradient)",
            }}
          >
            <TrendingUp className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">
              {t("quiz.review.bloomsProgression")}
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {uniqueCloIds.map((cloId) => (
                <BloomsProgressionLadder
                  key={cloId}
                  highestLevel={climbState.highest_level_reached ?? 0}
                  cloTitle={cloTitleMap.get(cloId) ?? cloId}
                  compact
                />
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Question Review List */}
      {questions.map((question: ReviewQuestion, index: number) => {
        const studentAnswer = attempt.answers[question.id] ?? "";
        const isCorrect = studentAnswer === question.correct_answer.value;
        const bloomLabelKey = BLOOM_LABEL_KEYS[question.bloom_level];
        const bloomLabel = bloomLabelKey
          ? t(bloomLabelKey, { ns: "common" })
          : t("quiz.review.bloomLevel", { level: question.bloom_level });
        const bloomColor =
          BLOOM_BADGE_COLORS[question.bloom_level] ?? "bg-gray-500 text-white";

        return (
          <Card
            key={question.id}
            className="bg-white border-0 shadow-md rounded-xl p-6 space-y-4"
          >
            {/* Question number + correct/incorrect indicator */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">
                {t("quiz.review.questionLabel", { number: index + 1 })}
              </p>
              {isCorrect ? (
                <div className="flex items-center gap-1.5 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-semibold">
                    {t("quiz.review.correct")}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-red-600">
                  <XCircle className="h-5 w-5" />
                  <span className="text-sm font-semibold">
                    {t("quiz.review.incorrect")}
                  </span>
                </div>
              )}
            </div>

            {/* Question preview with correct answer shown */}
            <QuestionPreview
              questionText={question.question_text}
              questionType={question.question_type}
              options={question.options}
              selectedAnswer={studentAnswer}
              showCorrectAnswer
              correctAnswer={question.correct_answer.value}
              disabled
            />

            {/* Explanation with confidence badge and verified preference */}
            <QuestionExplanation
              questionId={question.id}
              aiExplanation={question.explanation}
            />

            {/* Badges: CLO + Bloom's */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="text-xs font-bold border-transparent bg-green-100 text-green-700"
              >
                {question.clo_title ?? question.clo_id}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-bold border-transparent",
                  bloomColor
                )}
              >
                {bloomLabel}
              </Badge>
            </div>

            {/* Get Help link (shown for incorrect answers) */}
            {!isCorrect && (
              <Link
                to={`/student/tutor?cloIds=${question.clo_id}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                <HelpCircle className="h-4 w-4" />
                {t("quiz.review.getHelp")}
              </Link>
            )}
          </Card>
        );
      })}

      {/* Back to Dashboard */}
      <div className="flex justify-center pb-8">
        <Link to="/student/dashboard">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("quiz.review.backToDashboard")}
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default PostQuizReview;
