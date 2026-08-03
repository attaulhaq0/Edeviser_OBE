import { useMemo } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ClipboardList, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  useSurveys,
  useSurveyQuestions,
  useSubmitSurveyResponse,
  useHasRespondedToSurvey,
} from "@/hooks/useSurveys";
import type { Survey } from "@/hooks/useSurveys";
import SurveyForm from "@/components/shared/SurveyForm";
import { NoSurveys } from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import type { SurveyQuestion as SurveyFormQuestion } from "@/components/shared/SurveyForm";
import { PCard, SectionHeader, Shimmer } from "@/design-system";

// ─── Single Survey Card ─────────────────────────────────────────────────────

interface SurveyCardProps {
  survey: Survey;
}

const SurveyCard = ({ survey }: SurveyCardProps) => {
  const { t } = useTranslation("student");
  const { user } = useAuth();
  const { data: questions, isLoading: questionsLoading } = useSurveyQuestions(
    survey.id
  );
  const { data: hasResponded, isLoading: checkLoading } =
    useHasRespondedToSurvey(survey.id, user?.id);
  const submitResponse = useSubmitSurveyResponse();

  const formQuestions: SurveyFormQuestion[] = useMemo(
    () =>
      (questions ?? []).map((q) => ({
        id: q.id,
        questionText: q.question_text,
        questionType: q.question_type,
        options: q.options ?? undefined,
      })),
    [questions]
  );

  const handleSubmit = async (responses: Record<string, string>) => {
    if (!user?.id) return;

    const responseEntries = Object.entries(responses)
      .filter(([, value]) => value.trim() !== "")
      .map(([questionId, value]) => ({
        question_id: questionId,
        response_value: value,
      }));

    if (responseEntries.length === 0) {
      toast.error(t("surveys.toast.answerAtLeastOne"));
      return;
    }

    try {
      await submitResponse.mutateAsync({
        survey_id: survey.id,
        respondent_id: user.id,
        responses: responseEntries,
      });
      toast.success(t("surveys.toast.submitted"));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("surveys.toast.submitFailed")
      );
    }
  };

  if (questionsLoading || checkLoading) {
    return <Shimmer className="h-32 rounded-xl" />;
  }

  if (hasResponded) {
    return (
      <PCard>
        <div className="p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <h3 className="text-sm font-bold">{survey.title}</h3>
              <p className="text-xs text-gray-500">
                {t("surveys.alreadyCompleted")}
              </p>
            </div>
            <Badge className="ms-auto bg-green-50 text-green-700 border-green-200">
              {t("surveys.completed")}
            </Badge>
          </div>
        </div>
      </PCard>
    );
  }

  return (
    <PCard className="overflow-hidden">
      <div className="p-6">
        <SectionHeader icon={ClipboardList} title={survey.title} />
        <div className="mt-4">
          <SurveyForm
            title=""
            questions={formQuestions}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </PCard>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────

const SurveyResponsePage = () => {
  const { t } = useTranslation("student");
  const { data: surveys, isLoading, isError, refetch } = useSurveys();

  const activeSurveys = useMemo(
    () => (surveys ?? []).filter((s) => s.is_active),
    [surveys]
  );

  return (
    <div className="space-y-6">
      <SectionHeader icon={ClipboardList} title={t("surveys.title")} />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Shimmer key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          message={t("surveys.loadError")}
          onRetry={() => void refetch()}
          retryLabel={t("surveys.retry")}
        />
      ) : !activeSurveys.length ? (
        <NoSurveys />
      ) : (
        <div className="space-y-6">
          {activeSurveys.map((survey) => (
            <SurveyCard key={survey.id} survey={survey} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SurveyResponsePage;
