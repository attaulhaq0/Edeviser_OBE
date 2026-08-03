import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useTeacherDashboardAggregate } from "@/hooks/useTeacherDashboardAggregate";
import { useTeacherCourses } from "@/hooks/useCourses";
import { useCLOs } from "@/hooks/useCLOs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RoleProfileSurface, {
  ProfileSectionCard,
  ProfileSettingRow,
} from "@/components/shared/RoleProfileSurface";
import RoleProfileAccountPanels from "@/components/shared/RoleProfileAccountPanels";
import EmailPreferencesSection from "@/components/shared/EmailPreferencesSection";
import { Shimmer } from "@/design-system";

const TeacherProfilePage = () => {
  const { t } = useTranslation("common");
  const { profile, user } = useAuth();
  const aggregate = useTeacherDashboardAggregate(user?.id);
  const courses = useTeacherCourses({ pageSize: 6 });
  const clos = useCLOs(undefined, { pageSize: 1 });
  const kpis = aggregate.data?.kpis;
  const gradedTotal =
    (kpis?.gradedThisWeek ?? 0) + (kpis?.pendingSubmissions ?? 0);
  const gradingCompletion =
    gradedTotal > 0
      ? Math.round(((kpis?.gradedThisWeek ?? 0) / gradedTotal) * 100)
      : 0;

  const isLoading = aggregate.isPending || courses.isPending || clos.isPending;

  return (
    <RoleProfileSurface
      roleLabel={profile?.designation || t("roleProfile.teacher.role")}
      scopeLabel={profile?.department || t("roleProfile.teacher.scope")}
      isLoading={isLoading}
      primaryActionLabel={t("roleProfile.teacher.viewPublicProfile")}
      primaryActionHref="/teacher/students"
      contactRows={[
        {
          emoji: "✉️",
          label: profile?.email || t("roleProfile.noEmail"),
          href: profile?.email ? `mailto:${profile.email}` : undefined,
        },
        {
          emoji: "🏫",
          label: profile?.department || t("roleProfile.notSet"),
        },
        {
          emoji: "🎓",
          label: profile?.academic_rank || t("roleProfile.notSet"),
        },
      ]}
      stats={[
        {
          emoji: "📅",
          value: courses.data?.count ?? 0,
          label: t("roleProfile.teacher.classes"),
          tone: "blue",
        },
        {
          emoji: "👥",
          value: kpis?.totalStudents ?? 0,
          label: t("roleProfile.teacher.students"),
          tone: "green",
        },
        {
          emoji: "🎓",
          value: courses.data?.count ?? 0,
          label: t("roleProfile.teacher.courses"),
          tone: "teal",
        },
        {
          emoji: "🎯",
          value: clos.data?.count ?? 0,
          label: t("roleProfile.teacher.clos"),
          tone: "amber",
        },
      ]}
      overviewTitle={t("roleProfile.teacher.overview")}
      overviewDescription={t("roleProfile.teacher.overviewDescription")}
      overviewRows={[]}
      links={[]}
    >
      <ProfileSectionCard emoji="📈" title={t("roleProfile.teacher.impact")}>
        <div className="grid grid-cols-3 gap-3 p-5">
          <div className="text-center">
            <p className="text-2xl font-black text-emerald-600">
              {Math.round(kpis?.avgAttainment ?? 0)}%
            </p>
            <p className="text-[11px] text-slate-500">
              {t("roleProfile.teacher.avgMastery")}
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-slate-950">
              {gradingCompletion}%
            </p>
            <p className="text-[11px] text-slate-500">
              {t("roleProfile.teacher.gradingCompletion")}
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-blue-600">
              {kpis?.atRiskCount ?? 0}
            </p>
            <p className="text-[11px] text-slate-500">
              {t("roleProfile.teacher.atRisk")}
            </p>
          </div>
        </div>
      </ProfileSectionCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <ProfileSectionCard
          emoji="🛡️"
          title={t("roleProfile.teacher.aiAutonomy")}
          action={
            <Button asChild variant="link" size="sm">
              <Link to="/teacher/tutor-handoffs">
                {t("roleProfile.teacher.reviewControls")}
              </Link>
            </Button>
          }
        >
          <div className="p-4">
            <div className="grid grid-cols-4 overflow-hidden rounded-xl border border-slate-200">
              {["A0", "A1", "A2", "A3"].map((tier) => (
                <span
                  key={tier}
                  className={`py-2 text-center text-xs font-black ${
                    tier === "A2"
                      ? "bg-slate-950 text-white"
                      : "border-e border-slate-200 bg-slate-50 text-slate-500 last:border-e-0"
                  }`}
                >
                  {tier}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              {t("roleProfile.teacher.autonomyDescription")}
            </p>
          </div>
        </ProfileSectionCard>

        <ProfileSectionCard emoji="🪪" title={t("roleProfile.teacher.overview")}>
          <ProfileSettingRow
            title={t("roleProfile.teacher.department")}
            trailing={
              <Badge variant="secondary">
                {profile?.department || t("roleProfile.notSet")}
              </Badge>
            }
          />
          <ProfileSettingRow
            title={t("roleProfile.teacher.designation")}
            trailing={
              <Badge variant="secondary">
                {profile?.designation || t("roleProfile.notSet")}
              </Badge>
            }
          />
          <ProfileSettingRow
            title={t("roleProfile.teacher.highestDegree")}
            trailing={
              <Badge variant="secondary">
                {profile?.highest_degree || t("roleProfile.notSet")}
              </Badge>
            }
          />
        </ProfileSectionCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <EmailPreferencesSection
          title={t("roleProfile.teacher.notificationPreferences")}
          description={t("roleProfile.teacher.notificationDescription")}
          items={[
            {
              key: "streak_risk",
              label: t("roleProfile.teacher.atRiskAlerts"),
              description: t("roleProfile.teacher.atRiskAlertsDescription"),
            },
            {
              key: "new_assignment",
              label: t("roleProfile.teacher.newSubmissions"),
              description: t("roleProfile.teacher.newSubmissionsDescription"),
            },
            {
              key: "grade_released",
              label: t("roleProfile.teacher.handoffRequests"),
              description: t("roleProfile.teacher.handoffDescription"),
            },
            {
              key: "weekly_summary",
              label: t("roleProfile.teacher.weeklySummary"),
              description: t("roleProfile.teacher.weeklySummaryDescription"),
            },
          ]}
        />
        <div className="space-y-5">
          <RoleProfileAccountPanels />
        </div>
      </div>

      <ProfileSectionCard emoji="🎓" title={t("roleProfile.teacher.myClasses")}>
        {courses.isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }, (_, index) => (
              <Shimmer key={index} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : courses.data?.data.length ? (
          <div className="divide-y divide-slate-100">
            {courses.data.data.map((course) => (
              <Link
                key={course.id}
                to={`/teacher/courses/${course.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
              >
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-black text-blue-700">
                  {course.code.slice(0, 3).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm text-slate-900">
                    {course.code} · {course.name}
                  </strong>
                  <span className="block truncate text-xs text-slate-500">
                    {course.semester} · {course.academic_year}
                  </span>
                </span>
                <span className="text-slate-300" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="p-5 text-sm text-slate-500">
            {t("empty.noCourses.description")}
          </p>
        )}
      </ProfileSectionCard>
    </RoleProfileSurface>
  );
};

export default TeacherProfilePage;
