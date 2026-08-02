import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useAdminKPIs } from "@/hooks/useAdminDashboard";
import { useCoordinatorKPIs } from "@/hooks/useCoordinatorDashboard";
import { useCourses } from "@/hooks/useCourses";
import { useParentKPIs } from "@/hooks/useParentDashboard";
import { usePrograms } from "@/hooks/usePrograms";
import { useTeacherKPIs } from "@/hooks/useTeacherDashboard";

interface HeaderStatChipProps {
  emoji: string;
  value: string | number;
  label?: string;
  color: string;
}

const HeaderStatChip = ({
  emoji,
  value,
  label,
  color,
}: HeaderStatChipProps) => (
  <span
    className="stat-chip"
    style={{ color }}
    aria-label={label ? `${value} ${label}` : String(value)}
  >
    <span aria-hidden="true" style={{ fontSize: "14px", lineHeight: 1 }}>
      {emoji}
    </span>
    <span style={{ fontWeight: 800 }}>{value}</span>
    {label && <span style={{ fontWeight: 600, opacity: 0.8 }}>{label}</span>}
  </span>
);

/**
 * Prototype `.top-stats` for non-student roles.
 * Emoji icons + per-chip colors match shared.js ROLE_STATS exactly.
 */
const RoleHeaderStats = () => {
  const { t } = useTranslation("common");
  const { user, role, institutionId } = useAuth();
  const isTeacher = role === "teacher";
  const isCoordinator = role === "coordinator";
  const isAdmin = role === "admin";
  const isParent = role === "parent";

  const teacherKPIs = useTeacherKPIs({ enabled: isTeacher });
  const teacherCourses = useCourses(
    { page: 1, pageSize: 1, teacherId: user?.id },
    { enabled: isTeacher }
  );
  const coordinatorKPIs = useCoordinatorKPIs({
    enabled: isCoordinator,
    institutionId,
  });
  const programs = usePrograms(
    { page: 1, pageSize: 1 },
    { enabled: isCoordinator }
  );
  const adminKPIs = useAdminKPIs({ enabled: isAdmin });
  const parentKPIs = useParentKPIs(user?.id, { enabled: isParent });

  if (!role || role === "student") return null;

  const containerClassName = "top-stats";

  // Teacher: 🎓 N classes (teal) + ✍️ N to grade (amber-brown)
  if (isTeacher) {
    const classes = teacherCourses.data?.count ?? 0;
    const toGrade = teacherKPIs.data?.pendingSubmissions ?? 0;
    return (
      <div
        className={containerClassName}
        aria-label={t("header.stats.teacher")}
      >
        <HeaderStatChip
          emoji="🎓"
          value={`${classes} ${t("header.stats.classes")}`}
          color="#0f766e"
        />
        <HeaderStatChip
          emoji="✍️"
          value={`${toGrade} ${t("header.stats.toGrade")}`}
          color="#b45309"
        />
      </div>
    );
  }

  // Coordinator: 🎯 N programs (blue) + ⚠️ N gaps (amber-brown)
  if (isCoordinator) {
    const programCount = programs.data?.count ?? 0;
    const atRisk = coordinatorKPIs.data?.atRiskStudents ?? 0;
    return (
      <div
        className={containerClassName}
        aria-label={t("header.stats.coordinator")}
      >
        <HeaderStatChip
          emoji="🎯"
          value={`${programCount} ${t("header.stats.programs")}`}
          color="#2563eb"
        />
        <HeaderStatChip
          emoji="⚠️"
          value={`${atRisk} ${t("header.stats.belowTarget")}`}
          color="#b45309"
        />
      </div>
    );
  }

  // Admin: 🏛️ N learners (blue) + green active%
  if (isAdmin) {
    const totalUsers = adminKPIs.data?.totalUsers ?? 0;
    const activePercent = totalUsers
      ? Math.round(((adminKPIs.data?.activeUsers ?? 0) / totalUsers) * 100)
      : 0;
    const learners = adminKPIs.data?.usersByRole.student ?? 0;

    return (
      <div className={containerClassName} aria-label={t("header.stats.admin")}>
        <HeaderStatChip
          emoji="🏛️"
          value={`${learners.toLocaleString()} ${t("header.stats.learners")}`}
          color="#2563eb"
        />
        <HeaderStatChip
          emoji="📊"
          value={`${activePercent}% ${t("header.stats.activeAccounts")}`}
          color="#16a34a"
        />
      </div>
    );
  }

  // Parent: 🟢 On track / ⚠️ Needs attention
  const onTrack = (parentKPIs.data?.avgAttainment ?? 0) >= 50;
  return (
    <div className={containerClassName} aria-label={t("header.stats.parent")}>
      <HeaderStatChip
        emoji={onTrack ? "🟢" : "⚠️"}
        value={
          onTrack ? t("header.stats.onTrack") : t("header.stats.needsAttention")
        }
        color={onTrack ? "#16a34a" : "#b45309"}
      />
    </div>
  );
};

export default RoleHeaderStats;
