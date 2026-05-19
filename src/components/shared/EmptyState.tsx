// =============================================================================
// EmptyState — Generic empty state with icon, title, description
// =============================================================================

import {
  Inbox,
  BookOpen,
  TrendingUp,
  Bell,
  Trophy,
  FileText,
  ShoppingCart,
  Users,
  Swords,
  Target,
  HelpCircle,
  BarChart3,
  CalendarDays,
  ClipboardList,
  Clock,
  MessageSquare,
  GraduationCap,
  Ruler,
  CheckSquare,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

const EmptyState = ({
  icon,
  title,
  description,
  children,
  className,
}: EmptyStateProps) => (
  <Card
    className={cn(
      "flex flex-col items-center justify-center border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 shadow-sm rounded-xl py-12 px-6 text-center",
      className
    )}
  >
    <div className="mb-4 rounded-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 p-4">
      {icon ?? <Inbox className="h-8 w-8 text-gray-400 dark:text-gray-500" />}
    </div>
    <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">
      {title}
    </h3>
    {description && (
      <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
        {description}
      </p>
    )}
    {children && <div className="mt-5">{children}</div>}
  </Card>
);

export default EmptyState;
export type { EmptyStateProps };

// ============================================================================
// InlineEmpty — Lightweight empty for use INSIDE existing Card containers
// ============================================================================

interface InlineEmptyProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

export const InlineEmpty = ({
  icon,
  title,
  description,
  className,
  children,
}: InlineEmptyProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center py-10 px-4 text-center",
      className
    )}
  >
    <div className="mb-3 rounded-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 p-3">
      {icon ?? <Inbox className="h-6 w-6 text-gray-400 dark:text-gray-500" />}
    </div>
    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
      {title}
    </p>
    {description && (
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 max-w-xs leading-relaxed">
        {description}
      </p>
    )}
    {children && <div className="mt-3">{children}</div>}
  </div>
);

// ============================================================================
// Named variants for common empty states
// ============================================================================

interface EmptyStateVariantProps {
  children?: React.ReactNode;
  className?: string;
}

// Each variant is a proper named component to satisfy react-refresh/only-export-components
export const NoCourses = ({ children, className }: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<BookOpen className="h-8 w-8 text-gray-400" />}
      title={t("empty.noCourses.title")}
      description={t("empty.noCourses.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoProgress = ({ children, className }: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<TrendingUp className="h-8 w-8 text-gray-400" />}
      title={t("empty.noProgress.title")}
      description={t("empty.noProgress.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoUsers = ({ children, className }: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<Users className="h-8 w-8 text-gray-400" />}
      title={t("empty.noUsers.title")}
      description={t("empty.noUsers.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoNotifications = ({
  children,
  className,
}: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<Bell className="h-8 w-8 text-gray-400" />}
      title={t("empty.noNotifications.title")}
      description={t("empty.noNotifications.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoBadges = ({ children, className }: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<Trophy className="h-8 w-8 text-gray-400" />}
      title={t("empty.noBadges.title")}
      description={t("empty.noBadges.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoEvidence = ({ children, className }: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<FileText className="h-8 w-8 text-gray-400" />}
      title={t("empty.noEvidence.title")}
      description={t("empty.noEvidence.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoMarketplaceItems = ({
  children,
  className,
}: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<ShoppingCart className="h-8 w-8 text-gray-400" />}
      title={t("empty.noMarketplaceItems.title")}
      description={t("empty.noMarketplaceItems.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoLinkedStudents = ({
  children,
  className,
}: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<Users className="h-8 w-8 text-gray-400" />}
      title={t("empty.noLinkedStudents.title")}
      description={t("empty.noLinkedStudents.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoTeams = ({ children, className }: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<Users className="h-8 w-8 text-gray-400" />}
      title={t("empty.noTeams.title")}
      description={t("empty.noTeams.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoChallenges = ({
  children,
  className,
}: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<Swords className="h-8 w-8 text-gray-400" />}
      title={t("empty.noChallenges.title")}
      description={t("empty.noChallenges.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoOutcomes = ({ children, className }: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<Target className="h-8 w-8 text-gray-400" />}
      title={t("empty.noOutcomes.title")}
      description={t("empty.noOutcomes.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoQuestions = ({
  children,
  className,
}: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<HelpCircle className="h-8 w-8 text-gray-400" />}
      title={t("empty.noQuestions.title")}
      description={t("empty.noQuestions.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoResults = ({ children, className }: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<BarChart3 className="h-8 w-8 text-gray-400" />}
      title={t("empty.noResults.title")}
      description={t("empty.noResults.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoData = ({ children, className }: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<BarChart3 className="h-8 w-8 text-gray-400" />}
      title={t("empty.noData.title")}
      description={t("empty.noData.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoSessions = ({ children, className }: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<Clock className="h-8 w-8 text-gray-400" />}
      title={t("empty.noSessions.title")}
      description={t("empty.noSessions.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoSurveys = ({ children, className }: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<ClipboardList className="h-8 w-8 text-gray-400" />}
      title={t("empty.noSurveys.title")}
      description={t("empty.noSurveys.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoSemesters = ({
  children,
  className,
}: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<CalendarDays className="h-8 w-8 text-gray-400" />}
      title={t("empty.noSemesters.title")}
      description={t("empty.noSemesters.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoTimetable = ({
  children,
  className,
}: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<CalendarDays className="h-8 w-8 text-gray-400" />}
      title={t("empty.noTimetable.title")}
      description={t("empty.noTimetable.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoResponses = ({
  children,
  className,
}: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<MessageSquare className="h-8 w-8 text-gray-400" />}
      title={t("empty.noResponses.title")}
      description={t("empty.noResponses.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoAssignments = ({
  children,
  className,
}: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<FileText className="h-8 w-8 text-gray-400" />}
      title={t("empty.noAssignments.title")}
      description={t("empty.noAssignments.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoCLOs = ({ children, className }: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<Target className="h-8 w-8 text-gray-400" />}
      title={t("empty.noCLOs.title")}
      description={t("empty.noCLOs.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoPLOs = ({ children, className }: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<Target className="h-8 w-8 text-gray-400" />}
      title={t("empty.noPLOs.title")}
      description={t("empty.noPLOs.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoILOs = ({ children, className }: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<GraduationCap className="h-8 w-8 text-gray-400" />}
      title={t("empty.noILOs.title")}
      description={t("empty.noILOs.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoStudents = ({ children, className }: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<Users className="h-8 w-8 text-gray-400" />}
      title={t("empty.noStudents.title")}
      description={t("empty.noStudents.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoRubrics = ({ children, className }: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<Ruler className="h-8 w-8 text-gray-400" />}
      title={t("empty.noRubrics.title")}
      description={t("empty.noRubrics.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoActionPlans = ({
  children,
  className,
}: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<ListChecks className="h-8 w-8 text-gray-400" />}
      title={t("empty.noActionPlans.title")}
      description={t("empty.noActionPlans.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};
export const NoAttendance = ({
  children,
  className,
}: EmptyStateVariantProps) => {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={<CheckSquare className="h-8 w-8 text-gray-400" />}
      title={t("empty.noAttendance.title")}
      description={t("empty.noAttendance.description")}
      className={className}
    >
      {children}
    </EmptyState>
  );
};

// ============================================================================
// Inline variants — for use INSIDE existing Card containers (no Card wrapper)
// ============================================================================

export const InlineNoCLOs = ({ className }: { className?: string }) => {
  const { t } = useTranslation("common");
  return (
    <InlineEmpty
      icon={<Target className="h-6 w-6 text-gray-400" />}
      title={t("empty.noCLOs.title")}
      description={t("empty.noCLOs.description")}
      className={className}
    />
  );
};

export const InlineNoData = ({ className }: { className?: string }) => {
  const { t } = useTranslation("common");
  return (
    <InlineEmpty
      icon={<BarChart3 className="h-6 w-6 text-gray-400" />}
      title={t("empty.noData.title")}
      description={t("empty.noData.description")}
      className={className}
    />
  );
};

export const InlineNoTeams = ({ className }: { className?: string }) => {
  const { t } = useTranslation("common");
  return (
    <InlineEmpty
      icon={<Users className="h-6 w-6 text-gray-400" />}
      title={t("empty.noTeams.title")}
      description={t("empty.noTeams.description")}
      className={className}
    />
  );
};

export const InlineNoQuestions = ({ className }: { className?: string }) => {
  const { t } = useTranslation("common");
  return (
    <InlineEmpty
      icon={<HelpCircle className="h-6 w-6 text-gray-400" />}
      title={t("empty.noQuestions.title")}
      description={t("empty.noQuestions.description")}
      className={className}
    />
  );
};

export const InlineNoSessions = ({ className }: { className?: string }) => {
  const { t } = useTranslation("common");
  return (
    <InlineEmpty
      icon={<Clock className="h-6 w-6 text-gray-400" />}
      title={t("empty.noSessions.title")}
      description={t("empty.noSessions.description")}
      className={className}
    />
  );
};

export const InlineNoResponses = ({ className }: { className?: string }) => {
  const { t } = useTranslation("common");
  return (
    <InlineEmpty
      icon={<MessageSquare className="h-6 w-6 text-gray-400" />}
      title={t("empty.noResponses.title")}
      description={t("empty.noResponses.description")}
      className={className}
    />
  );
};

export const InlineNoTimetable = ({ className }: { className?: string }) => {
  const { t } = useTranslation("common");
  return (
    <InlineEmpty
      icon={<CalendarDays className="h-6 w-6 text-gray-400" />}
      title={t("empty.noTimetable.title")}
      description={t("empty.noTimetable.description")}
      className={className}
    />
  );
};

export const InlineNoBadges = ({ className }: { className?: string }) => {
  const { t } = useTranslation("common");
  return (
    <InlineEmpty
      icon={<Trophy className="h-6 w-6 text-gray-400" />}
      title={t("empty.noBadges.title")}
      description={t("empty.noBadges.description")}
      className={className}
    />
  );
};

export const InlineNoXPData = ({ className }: { className?: string }) => {
  const { t } = useTranslation("common");
  return (
    <InlineEmpty
      icon={<TrendingUp className="h-6 w-6 text-gray-400" />}
      title={t("empty.noXPData.title")}
      description={t("empty.noXPData.description")}
      className={className}
    />
  );
};

export const InlineNoImprovementData = ({
  className,
}: {
  className?: string;
}) => {
  const { t } = useTranslation("common");
  return (
    <InlineEmpty
      icon={<TrendingUp className="h-6 w-6 text-gray-400" />}
      title={t("empty.noImprovementData.title")}
      description={t("empty.noImprovementData.description")}
      className={className}
    />
  );
};

export const InlineNoLeaderboardData = ({
  className,
}: {
  className?: string;
}) => {
  const { t } = useTranslation("common");
  return (
    <InlineEmpty
      icon={<Users className="h-6 w-6 text-gray-400" />}
      title={t("empty.noLeaderboardData.title")}
      description={t("empty.noLeaderboardData.description")}
      className={className}
    />
  );
};

export const InlineNoCorrelationData = ({
  className,
}: {
  className?: string;
}) => {
  const { t } = useTranslation("common");
  return (
    <InlineEmpty
      icon={<BarChart3 className="h-6 w-6 text-gray-400" />}
      title={t("empty.noCorrelationData.title")}
      description={t("empty.noCorrelationData.description")}
      className={className}
    />
  );
};

export const InlineNoBloomsData = ({ className }: { className?: string }) => {
  const { t } = useTranslation("common");
  return (
    <InlineEmpty
      icon={<BarChart3 className="h-6 w-6 text-gray-400" />}
      title={t("empty.noBloomsData.title")}
      description={t("empty.noBloomsData.description")}
      className={className}
    />
  );
};

export const InlineNoUsageData = ({ className }: { className?: string }) => {
  const { t } = useTranslation("common");
  return (
    <InlineEmpty
      icon={<CalendarDays className="h-6 w-6 text-gray-400" />}
      title={t("empty.noUsageData.title")}
      description={t("empty.noUsageData.description")}
      className={className}
    />
  );
};

export const InlineNoCitationData = ({ className }: { className?: string }) => {
  const { t } = useTranslation("common");
  return (
    <InlineEmpty
      icon={<FileText className="h-6 w-6 text-gray-400" />}
      title={t("empty.noCitationData.title")}
      description={t("empty.noCitationData.description")}
      className={className}
    />
  );
};

export const InlineNoAttainmentData = ({
  className,
}: {
  className?: string;
}) => {
  const { t } = useTranslation("common");
  return (
    <InlineEmpty
      icon={<Target className="h-6 w-6 text-gray-400" />}
      title={t("empty.noAttainmentData.title")}
      description={t("empty.noAttainmentData.description")}
      className={className}
    />
  );
};

export const InlineNoSemesters = ({ className }: { className?: string }) => {
  const { t } = useTranslation("common");
  return (
    <InlineEmpty
      icon={<CalendarDays className="h-6 w-6 text-gray-400" />}
      title={t("empty.noSemesters.title")}
      description={t("empty.noSemesters.description")}
      className={className}
    />
  );
};

export const InlineNoPLOs = ({ className }: { className?: string }) => {
  const { t } = useTranslation("common");
  return (
    <InlineEmpty
      icon={<Target className="h-6 w-6 text-gray-400" />}
      title={t("empty.noPLOs.title")}
      description={t("empty.noPLOs.description")}
      className={className}
    />
  );
};

export const InlineNoILOs = ({ className }: { className?: string }) => {
  const { t } = useTranslation("common");
  return (
    <InlineEmpty
      icon={<GraduationCap className="h-6 w-6 text-gray-400" />}
      title={t("empty.noILOs.title")}
      description={t("empty.noILOs.description")}
      className={className}
    />
  );
};

export const InlineNoStudents = ({ className }: { className?: string }) => {
  const { t } = useTranslation("common");
  return (
    <InlineEmpty
      icon={<Users className="h-6 w-6 text-gray-400" />}
      title={t("empty.noStudents.title")}
      description={t("empty.noStudents.description")}
      className={className}
    />
  );
};
