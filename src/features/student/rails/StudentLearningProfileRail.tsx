import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RailCard, RailHead, Shimmer } from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useStudentProfile } from "@/hooks/useStudentProfile";

/** Contextual prototype rail for the student learning-profile route. */
const StudentLearningProfileRail = () => {
  const { t } = useTranslation("student");
  const { user } = useAuth();
  const profile = useStudentProfile(user?.id ?? "");
  const completeness = profile.data?.profile_completeness;
  const boundedCompleteness =
    completeness == null ? null : Math.max(0, Math.min(100, completeness));

  return (
    <aside
      aria-label={t("learningProfile.rail.label")}
      className="hidden max-h-[calc(100vh-var(--app-header-h))] overflow-y-auto px-5 py-4 xl:sticky xl:top-[var(--app-header-h)] xl:col-start-3 xl:row-start-1 xl:block"
    >
      <RailCard>
        <RailHead title={t("learningProfile.rail.whyTitle")} />
        <p className="m-0 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {t("learningProfile.rail.whyBody")}
        </p>
      </RailCard>

      <RailCard>
        <RailHead
          title={t("learningProfile.rail.completenessTitle")}
          right={
            boundedCompleteness == null
              ? undefined
              : `${Math.round(boundedCompleteness)}%`
          }
        />
        {profile.isPending ? (
          <Shimmer className="h-5 rounded-md" />
        ) : boundedCompleteness == null ? (
          <p className="text-xs text-slate-500">
            {t("learningProfile.rail.completenessEmpty")}
          </p>
        ) : (
          <>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label={t("learningProfile.completeness")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(boundedCompleteness)}
            >
              <div
                className="h-full rounded-full bg-teal-500 transition-[width]"
                style={{ width: `${boundedCompleteness}%` }}
              />
            </div>
            {boundedCompleteness < 100 ? (
              <Link
                to="/student/settings/reassessment"
                className="mt-2 block text-xs font-extrabold text-blue-600 hover:underline"
              >
                {t("learningProfile.rail.finishAssessments")}
              </Link>
            ) : null}
          </>
        )}
      </RailCard>
    </aside>
  );
};

export default StudentLearningProfileRail;
