import {
  Activity,
  CircleCheck,
  GraduationCap,
  Landmark,
  PenLine,
  Target,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useAdminKPIs } from "@/hooks/useAdminDashboard";
import { useCoordinatorKPIs } from "@/hooks/useCoordinatorDashboard";
import { useCourses } from "@/hooks/useCourses";
import { useParentKPIs } from "@/hooks/useParentDashboard";
import { usePrograms } from "@/hooks/usePrograms";
import { useTeacherKPIs } from "@/hooks/useTeacherDashboard";

interface HeaderStatChipProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
}

const HeaderStatChip = ({ icon: Icon, value, label }: HeaderStatChipProps) => (
  <span className="stat-chip" aria-label={`${value} ${label}`}>
    <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
    <span>{value}</span>
    <span className="text-muted-foreground">{label}</span>
  </span>
);

/**
 * Prototype `.top-stats` for non-student roles. Every rendered number comes
 * from an established query hook; unsupported prototype metrics are omitted.
 */
const RoleHeaderStats = () => {
  const { t } = useTranslation("common");
  const { user, role } = useAuth();
  const isTeacher = role === "teacher";
  const isCoordinator = role === "coordinator";
  const isAdmin = role === "admin";
  const isParent = role === "parent";

  const teacherKPIs = useTeacherKPIs({ enabled: isTeacher });
  const teacherCourses = useCourses(
    { page: 1, pageSize: 1, teacherId: user?.id },
    { enabled: isTeacher }
  );
  const coordinatorKPIs = useCoordinatorKPIs({ enabled: isCoordinator });
  const programs = usePrograms(
    { page: 1, pageSize: 1 },
    { enabled: isCoordinator }
  );
  const adminKPIs = useAdminKPIs({ enabled: isAdmin });
  const parentKPIs = useParentKPIs(user?.id, { enabled: isParent });

  if (!role || role === "student") return null;

  const containerClassName = "top-stats";

  if (isTeacher) {
    return (
      <div
        className={containerClassName}
        aria-label={t("header.stats.teacher")}
      >
        <HeaderStatChip
          icon={GraduationCap}
          value={teacherCourses.data?.count ?? 0}
          label={t("header.stats.classes")}
        />
        <HeaderStatChip
          icon={PenLine}
          value={teacherKPIs.data?.pendingSubmissions ?? 0}
          label={t("header.stats.toGrade")}
        />
      </div>
    );
  }

  if (isCoordinator) {
    return (
      <div
        className={containerClassName}
        aria-label={t("header.stats.coordinator")}
      >
        <HeaderStatChip
          icon={Target}
          value={programs.data?.count ?? 0}
          label={t("header.stats.programs")}
        />
        <HeaderStatChip
          icon={TriangleAlert}
          value={coordinatorKPIs.data?.atRiskStudents ?? 0}
          label={t("header.stats.belowTarget")}
        />
      </div>
    );
  }

  if (isAdmin) {
    const totalUsers = adminKPIs.data?.totalUsers ?? 0;
    const activePercent = totalUsers
      ? Math.round(((adminKPIs.data?.activeUsers ?? 0) / totalUsers) * 100)
      : 0;

    return (
      <div className={containerClassName} aria-label={t("header.stats.admin")}>
        <HeaderStatChip
          icon={Landmark}
          value={adminKPIs.data?.usersByRole.student ?? 0}
          label={t("header.stats.learners")}
        />
        <HeaderStatChip
          icon={Activity}
          value={`${activePercent}%`}
          label={t("header.stats.activeAccounts")}
        />
      </div>
    );
  }

  const onTrack = (parentKPIs.data?.avgAttainment ?? 0) >= 50;
  return (
    <div className={containerClassName} aria-label={t("header.stats.parent")}>
      <HeaderStatChip
        icon={CircleCheck}
        value={
          onTrack ? t("header.stats.onTrack") : t("header.stats.needsAttention")
        }
        label={t("header.stats.childProgress")}
      />
    </div>
  );
};

export default RoleHeaderStats;
