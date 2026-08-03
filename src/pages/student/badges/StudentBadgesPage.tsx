import { useTranslation } from "react-i18next";
import { Award, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  usePinBadge,
  useTieredBadges,
  useUnpinBadge,
} from "@/hooks/useTieredBadges";
import BadgeCollection from "@/components/shared/BadgeCollection";
import ErrorState from "@/components/shared/ErrorState";
import { PCard, Shimmer } from "@/design-system";

const StudentBadgesPage = () => {
  const { t } = useTranslation("student");
  const { user } = useAuth();
  const badges = useTieredBadges(user?.id);
  const pinBadge = usePinBadge();
  const unpinBadge = useUnpinBadge();

  if (badges.isLoading) {
    return (
      <div className="space-y-5">
        <Shimmer className="h-12 w-56 rounded-xl" />
        <Shimmer className="h-80 rounded-[20px]" />
      </div>
    );
  }

  if (badges.isError) {
    return (
      <ErrorState
        message={t("badges.loadError")}
        onRetry={() => void badges.refetch()}
        retryLabel={t("badges.retry")}
      />
    );
  }

  const earnedBadges = badges.data ?? [];
  const pinnedCount = earnedBadges.filter((badge) => badge.is_pinned).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Award className="size-5 text-amber-500" aria-hidden="true" />
            <h1 className="text-2xl font-bold tracking-tight">
              {t("badges.title")}
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("badges.subtitle")}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 sm:self-auto">
          <Sparkles className="size-3.5" aria-hidden="true" />
          {t("badges.pinned", { count: pinnedCount })}
        </span>
      </div>

      <PCard className="p-5 sm:p-6">
        <BadgeCollection
          tieredBadges={earnedBadges}
          onPinBadge={(badgeId) => pinBadge.mutate({ badgeId })}
          onUnpinBadge={(badgeId) => unpinBadge.mutate({ badgeId })}
        />
      </PCard>
    </div>
  );
};

export default StudentBadgesPage;
