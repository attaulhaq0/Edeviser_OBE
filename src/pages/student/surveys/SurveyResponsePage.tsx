import { useMemo } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ClipboardList, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
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
import type { SurveyQuestion as SurveyFormQuestion } from "@/components/shared/SurveyForm";

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
    return <div className="h-32 rounded-xl animate-shimmer" />;
  }

  if (hasResponded) {
    return (
      <Card className="bg-white border-0 shadow-md rounded-xl p-6">
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
      </Card>
    );
  }

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
      <div
        className="px-6 py-4 flex items-center gap-2"
        style={{
          background: "var(--brand-gradient)",
        }}
      >
        <ClipboardList className="h-5 w-5 text-white" />
        <h2 className="text-lg font-bold tracking-tight text-white">
          {survey.title}
        </h2>
      </div>
      <div className="p-6">
        <SurveyForm
          title=""
          questions={formQuestions}
          onSubmit={handleSubmit}
        />
      </div>
    </Card>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────

const SurveyResponsePage = () => {
  const { t } = useTranslation("student");
  const { data: surveys, isLoading } = useSurveys();

  const activeSurveys = useMemo(
    () => (surveys ?? []).filter((s) => s.is_active),
    [surveys]
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {t("surveys.title")}
      </h1>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl animate-shimmer" />
          ))}
        </div>
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
