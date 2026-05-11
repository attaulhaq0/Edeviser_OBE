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
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  <div
    className={cn(
      "flex flex-col items-center justify-center py-12 text-center",
      className
    )}
  >
    <div className="mb-4 rounded-full bg-slate-100 p-4">
      {icon ?? <Inbox className="h-8 w-8 text-gray-400" />}
    </div>
    <h3 className="text-lg font-bold tracking-tight text-gray-900">{title}</h3>
    {description && (
      <p className="mt-1 text-sm text-gray-500 max-w-sm">{description}</p>
    )}
    {children && <div className="mt-4">{children}</div>}
  </div>
);

export default EmptyState;
export type { EmptyStateProps };

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
