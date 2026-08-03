import { useTranslation } from "react-i18next";
import { BarChart3, Brain, Compass, RefreshCw, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ErrorState from "@/components/shared/ErrorState";
import { PCard, Shimmer } from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useStudentProfile } from "@/hooks/useStudentProfile";

interface ScoreItemProps {
  label: string;
  value: number;
}

const ScoreItem = ({ label, value }: ScoreItemProps) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="font-medium text-slate-600">{label}</span>
      <span className="font-bold text-slate-900">{Math.round(value)}%</span>
    </div>
    <ProfileProgress
      value={value}
      ariaLabel={`${label}: ${Math.round(value)}%`}
    />
  </div>
);

const LearningProfilePage = () => {
  const { t } = useTranslation("student");
  const { user } = useAuth();
  const profile = useStudentProfile(user?.id ?? "");
  const data = profile.data;

  if (profile.isLoading) {
    return (
      <div className="space-y-5">
        <Shimmer className="h-12 w-64 rounded-xl" />
        <Shimmer className="h-72 rounded-[20px]" />
      </div>
    );
  }

  if (profile.isError) {
    return (
      <ErrorState
        message={t("learningProfile.loadError")}
        onRetry={() => void profile.refetch()}
        retryLabel={t("learningProfile.retry")}
      />
    );
  }

  if (!data) {
    return (
      <PCard className="mx-auto max-w-2xl p-6 text-center sm:p-8">
        <Brain className="mx-auto size-9 text-teal-600" aria-hidden="true" />
        <h1 className="mt-3 text-xl font-bold tracking-tight">
          {t("learningProfile.emptyTitle")}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {t("learningProfile.emptyBody")}
        </p>
        <Button asChild variant="tactile" className="mt-5">
          <Link to="/student/onboarding/complete-profile">
            {t("learningProfile.completeProfile")}
          </Link>
        </Button>
      </PCard>
    );
  }

  const learningStyle = data.learning_style;
  const selfEfficacy = data.self_efficacy;
  const studyStrategies = data.study_strategies;
  const traits = data.personality_traits;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="size-5 text-teal-600" aria-hidden="true" />
            <h1 className="text-2xl font-bold tracking-tight">
              {t("learningProfile.title")}
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("learningProfile.subtitle")}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/student/settings/reassessment">
            <RefreshCw className="size-4" aria-hidden="true" />
            {t("learningProfile.reassess")}
          </Link>
        </Button>
      </div>

      <PCard className="border-teal-200 bg-gradient-to-br from-teal-50 to-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700">
              {t("learningProfile.completeness")}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-slate-900">
                {Math.round(data.profile_completeness)}%
              </span>
              <span className="text-sm text-slate-600">
                {t("learningProfile.personalization")}
              </span>
            </div>
            <ProfileProgress
              className="mt-3 bg-white"
              value={data.profile_completeness}
              ariaLabel={t("learningProfile.completeness")}
            />
          </div>
        </div>
      </PCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <ProfileSection
          icon={<Brain className="size-5" aria-hidden="true" />}
          title={t("learningProfile.learningStyle")}
        >
          {learningStyle ? (
            <>
              <p className="text-sm font-bold text-slate-900">
                {t("learningProfile.dominantStyle", {
                  style: t(
                    `learningProfile.styles.${learningStyle.dominant_style}`
                  ),
                })}
              </p>
              <div className="mt-4 space-y-3">
                <ScoreItem
                  label={t("learningProfile.styles.visual")}
                  value={learningStyle.visual}
                />
                <ScoreItem
                  label={t("learningProfile.styles.auditory")}
                  value={learningStyle.auditory}
                />
                <ScoreItem
                  label={t("learningProfile.styles.read_write")}
                  value={learningStyle.read_write}
                />
                <ScoreItem
                  label={t("learningProfile.styles.kinesthetic")}
                  value={learningStyle.kinesthetic}
                />
              </div>
            </>
          ) : (
            <MissingSection
              message={t("learningProfile.missingLearningStyle")}
            />
          )}
        </ProfileSection>

        <ProfileSection
          icon={<BarChart3 className="size-5" aria-hidden="true" />}
          title={t("learningProfile.studyStrategies")}
        >
          {studyStrategies ? (
            <div className="space-y-3">
              <ScoreItem
                label={t("learningProfile.strategies.time_management")}
                value={studyStrategies.time_management}
              />
              <ScoreItem
                label={t("learningProfile.strategies.elaboration")}
                value={studyStrategies.elaboration}
              />
              <ScoreItem
                label={t("learningProfile.strategies.self_testing")}
                value={studyStrategies.self_testing}
              />
              <ScoreItem
                label={t("learningProfile.strategies.help_seeking")}
                value={studyStrategies.help_seeking}
              />
            </div>
          ) : (
            <MissingSection message={t("learningProfile.missingStrategies")} />
          )}
        </ProfileSection>

        <ProfileSection
          icon={<Sparkles className="size-5" aria-hidden="true" />}
          title={t("learningProfile.selfEfficacy")}
        >
          {selfEfficacy ? (
            <div className="space-y-3">
              <ScoreItem
                label={t("learningProfile.overall")}
                value={selfEfficacy.overall}
              />
              <ScoreItem
                label={t("learningProfile.efficacy.general_academic")}
                value={selfEfficacy.general_academic}
              />
              <ScoreItem
                label={t("learningProfile.efficacy.course_specific")}
                value={selfEfficacy.course_specific}
              />
              <ScoreItem
                label={t("learningProfile.efficacy.self_regulated_learning")}
                value={selfEfficacy.self_regulated_learning}
              />
            </div>
          ) : (
            <MissingSection message={t("learningProfile.missingEfficacy")} />
          )}
        </ProfileSection>

        <ProfileSection
          icon={<Brain className="size-5" aria-hidden="true" />}
          title={t("learningProfile.personality")}
        >
          {traits ? (
            <div className="space-y-3">
              <ScoreItem
                label={t("learningProfile.traits.openness")}
                value={traits.openness}
              />
              <ScoreItem
                label={t("learningProfile.traits.conscientiousness")}
                value={traits.conscientiousness}
              />
              <ScoreItem
                label={t("learningProfile.traits.extraversion")}
                value={traits.extraversion}
              />
              <ScoreItem
                label={t("learningProfile.traits.agreeableness")}
                value={traits.agreeableness}
              />
              <ScoreItem
                label={t("learningProfile.traits.neuroticism")}
                value={traits.neuroticism}
              />
            </div>
          ) : (
            <MissingSection message={t("learningProfile.missingPersonality")} />
          )}
        </ProfileSection>
      </div>
    </div>
  );
};

const ProfileSection = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <PCard className="p-5 sm:p-6">
    <div className="mb-5 flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
        {icon}
      </span>
      <h2 className="font-black tracking-tight text-slate-900">{title}</h2>
    </div>
    {children}
  </PCard>
);

const MissingSection = ({ message }: { message: string }) => (
  <p className="text-sm text-muted-foreground">{message}</p>
);

const ProfileProgress = ({
  value,
  ariaLabel,
  className = "",
}: {
  value: number;
  ariaLabel: string;
  className?: string;
}) => {
  const boundedValue = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`h-2 overflow-hidden rounded-full bg-slate-100 ${className}`}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={boundedValue}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-500 transition-[width]"
        style={{ width: `${boundedValue}%` }}
      />
    </div>
  );
};

export default LearningProfilePage;
