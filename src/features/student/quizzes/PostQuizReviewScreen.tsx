import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  XCircle,
} from "lucide-react";

import ErrorState from "@/components/shared/ErrorState";
import QuestionPreview from "@/components/shared/QuestionPreview";
import ExplanationConfidenceBadge from "@/components/shared/ExplanationConfidenceBadge";
import { InlineNoCLOs } from "@/components/shared/EmptyState";
import { BloomsProgressionLadder } from "@/components/shared/BloomsProgressionLadder";
import { Button, Badge, PCard, SectionHeader, Shimmer } from "@/design-system";
import { computePerCLOScore } from "@/lib/questionAnalytics";
import { useQuizReview, type ReviewQuestion } from "@/hooks/useQuizReview";
import {
  useVerifiedExplanation,
  useExplanationConfidence,
} from "@/hooks/useExplanationConfidence";
import { useBloomsClimbState } from "@/hooks/useBloomsProgression";

const BLOOM_LABEL_KEYS: Record<number, string> = {
  1: "blooms.remembering",
  2: "blooms.understanding",
  3: "blooms.applying",
  4: "blooms.analyzing",
  5: "blooms.evaluating",
  6: "blooms.creating",
};

const QuestionExplanation = ({
  questionId,
  aiExplanation,
}: {
  questionId: string;
  aiExplanation: string | null;
}) => {
  const { t } = useTranslation("student");
  const { data: verifiedExplanation } = useVerifiedExplanation(questionId);
  const { data: confidence } = useExplanationConfidence(questionId);

  const isVerified = !!verifiedExplanation;
  const displayText = isVerified
    ? verifiedExplanation.explanation_text
    : aiExplanation;

  if (!displayText) return null;

  return (
    <div className="rounded-2xl bg-blue-50/80 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-700">
          {isVerified
            ? t("quiz.review.verifiedExplanation")
            : t("quiz.review.aiExplanation")}
        </p>
        <ExplanationConfidenceBadge
          confidence={confidence ?? null}
          isVerified={isVerified}
        />
      </div>
      <p className="text-sm leading-6 text-slate-700">{displayText}</p>
    </div>
  );
};

const QuestionReviewCard = ({
  question,
  index,
  answer,
}: {
  question: ReviewQuestion;
  index: number;
  answer: string;
}) => {
  const { t } = useTranslation("student");
  const isCorrect = answer === question.correct_answer.value;
  const bloomLabelKey = BLOOM_LABEL_KEYS[question.bloom_level];
  const bloomLabel = bloomLabelKey
    ? t(bloomLabelKey, { ns: "common" })
    : t("quiz.review.bloomLevel", { level: question.bloom_level });

  return (
    <PCard className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">
            {t("quiz.review.questionLabel", {
              defaultValue: "Question {{count}}",
              count: index + 1,
            })}
          </p>
          <h3 className="truncate text-sm font-bold text-foreground">
            {question.clo_title ?? question.clo_id}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge
            variant={isCorrect ? "default" : "secondary"}
            className="rounded-full px-3 py-1 text-[11px]"
          >
            {isCorrect ? (
              <CheckCircle2 className="me-1 size-3.5" />
            ) : (
              <XCircle className="me-1 size-3.5" />
            )}
            {isCorrect ? t("quiz.review.correct") : t("quiz.review.incorrect")}
          </Badge>
          <Badge
            variant="outline"
            className="rounded-full px-3 py-1 text-[11px]"
          >
            {bloomLabel}
          </Badge>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <QuestionPreview
          questionText={question.question_text}
          questionType={question.question_type}
          options={question.options}
          selectedAnswer={answer}
          showCorrectAnswer
          correctAnswer={question.correct_answer.value}
          disabled
        />

        <QuestionExplanation
          questionId={question.id}
          aiExplanation={question.explanation}
        />

        {!isCorrect ? (
          <Button asChild variant="outline" size="sm">
            <Link to={`/student/tutor?cloIds=${question.clo_id}`}>
              <HelpCircle className="me-1 size-4" aria-hidden="true" />
              {t("quiz.review.getHelp")}
            </Link>
          </Button>
        ) : null}
      </div>
    </PCard>
  );
};

const PostQuizReviewScreen = () => {
  const { t } = useTranslation("student");
  const { quizId, attemptId } = useParams<{
    quizId: string;
    attemptId: string;
  }>();

  const review = useQuizReview(quizId, attemptId);
  const climbState = useBloomsClimbState(attemptId ?? "");

  const data = review.data;
  const highestBloomLevel = climbState.data?.highest_level_reached ?? 0;

  const perCLOScores = useMemo(() => {
    if (!data) return {};
    const answerDetails = data.questions.map((question) => ({
      clo_id: question.clo_id,
      is_correct:
        data.attempt.answers[question.id] === question.correct_answer.value,
    }));
    return computePerCLOScore(answerDetails);
  }, [data]);

  const cloTitleMap = useMemo(() => {
    if (!data) return new Map<string, string>();
    return new Map(
      data.questions.map((question) => [
        question.clo_id,
        question.clo_title ?? question.clo_id,
      ])
    );
  }, [data]);

  const uniqueCloIds = useMemo(
    () =>
      data
        ? [...new Set(data.questions.map((question) => question.clo_id))]
        : [],
    [data]
  );

  if (review.isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Shimmer className="h-8 w-40 rounded-2xl" />
          <Shimmer className="h-8 w-56 rounded-2xl" />
        </div>
        <Shimmer className="h-48 rounded-3xl" />
        <Shimmer className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (review.isError || !data) {
    return (
      <ErrorState
        title={t("quiz.review.loadFailed")}
        message={t(
          "quiz.review.loadFailedDescription",
          "We couldn't load this quiz review."
        )}
        onRetry={() => {
          void review.refetch();
          void climbState.refetch();
        }}
        retryLabel={t("common:buttons.retry", "Try again")}
      >
        <Link to="/student/dashboard">
          <Button variant="outline" className="mt-2">
            <ArrowLeft className="me-1 size-4" />
            {t("quiz.review.backToDashboard")}
          </Button>
        </Link>
      </ErrorState>
    );
  }

  const answeredCount = data.questions.reduce(
    (count, question) => count + (data.attempt.answers[question.id] ? 1 : 0),
    0
  );
  const correctCount = data.questions.reduce(
    (count, question) =>
      count +
      (data.attempt.answers[question.id] === question.correct_answer.value
        ? 1
        : 0),
    0
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          to="/student/dashboard"
          className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <ArrowLeft className="me-1 size-4" />
            {t("quiz.review.backToDashboard")}
          </Button>
        </Link>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {t("quiz.review.title")}
          </p>
          <h1 className="truncate text-2xl font-black tracking-tight text-foreground">
            {t("quiz.review.overallScore")}{" "}
            <span className="text-teal-700">{data.attempt.score}%</span>
          </h1>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <PCard className="p-5">
          <SectionHeader
            icon={CheckCircle2}
            title={t("quiz.review.overallScore")}
            description={t(
              "quiz.review.summaryHint",
              "Here’s how the attempt landed across the CLOs you touched."
            )}
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">
                {t("quiz.review.score")}
              </p>
              <p className="mt-1 text-3xl font-black text-foreground">
                {data.attempt.score}%
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">
                {t("quiz.review.answered", "Answered")}
              </p>
              <p className="mt-1 text-3xl font-black text-foreground">
                {answeredCount}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">
                {t("quiz.review.correct", "Correct")}
              </p>
              <p className="mt-1 text-3xl font-black text-foreground">
                {correctCount}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Badge className="rounded-full px-3 py-1 text-[11px]">
              {t("quiz.review.questions", {
                defaultValue: "{{count}} questions",
                count: data.questions.length,
              })}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full px-3 py-1 text-[11px]"
            >
              {t("quiz.review.attempt", {
                defaultValue: "Attempt {{id}}",
                id: data.attempt.id.slice(0, 8),
              })}
            </Badge>
          </div>
        </PCard>

        <PCard className="p-5">
          <SectionHeader
            icon={TrendingUp}
            title={t("quiz.review.bloomsProgression")}
            description={t(
              "quiz.review.bloomsProgressionHint",
              "Review the Bloom’s path and where your confidence climbed."
            )}
          />

          {climbState.data && uniqueCloIds.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {uniqueCloIds.map((cloId) => (
                <BloomsProgressionLadder
                  key={cloId}
                  highestLevel={highestBloomLevel}
                  cloTitle={cloTitleMap.get(cloId) ?? cloId}
                  compact
                />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-muted-foreground">
              {t(
                "quiz.review.noBloomData",
                "No Bloom’s progression data was recorded."
              )}
            </div>
          )}
        </PCard>
      </div>

      <PCard className="p-5">
        <SectionHeader
          icon={HelpCircle}
          title={t("quiz.review.perCloBreakdown")}
          description={t(
            "quiz.review.perCloBreakdownHint",
            "How each CLO performed in this attempt."
          )}
        />

        <div className="mt-4 space-y-4">
          {Object.entries(perCLOScores).length > 0 ? (
            Object.entries(perCLOScores).map(([cloId, score]) => (
              <div key={cloId} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium text-foreground">
                    {cloTitleMap.get(cloId) ?? cloId}
                  </span>
                  <Badge
                    variant="outline"
                    className="rounded-full px-3 py-1 text-[11px]"
                  >
                    {Math.round(score)}%
                  </Badge>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-500"
                    style={{ width: `${Math.min(score, 100)}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <InlineNoCLOs />
          )}
        </div>
      </PCard>

      <div className="space-y-4">
        {data.questions.map((question, index) => (
          <QuestionReviewCard
            key={question.id}
            question={question}
            index={index}
            answer={data.attempt.answers[question.id] ?? ""}
          />
        ))}
      </div>
    </div>
  );
};

export default PostQuizReviewScreen;
