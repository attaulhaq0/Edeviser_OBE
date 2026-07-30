import { Flame, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button, RailCard, RailHead, RailRow } from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useLevel } from "@/hooks/useLevel";
import { useStreak } from "@/hooks/useStreak";

/** Real-data fallback for student routes without a dedicated contextual rail. */
const StudentFallbackRail = () => {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const streak = useStreak();
  const level = useLevel(user?.id);

  return (
    <aside
      aria-label={t("studentRailFallback.label")}
      className="hidden max-h-[calc(100vh-var(--app-header-h))] overflow-y-auto px-5 py-4 xl:sticky xl:top-[var(--app-header-h)] xl:col-start-3 xl:row-start-1 xl:block"
    >
      <RailCard>
        <RailHead title={t("studentRailFallback.title")} />
        <RailRow>
          <Flame className="size-4 text-primary" aria-hidden="true" />
          <span className="flex-1">{t("studentRailFallback.streak")}</span>
          <strong>{streak.data?.streak_count ?? 0}</strong>
        </RailRow>
        <RailRow>
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          <span className="flex-1">{t("studentRailFallback.level")}</span>
          <strong>{level.data?.level ?? 1}</strong>
        </RailRow>
        <Button asChild variant="tactile" size="sm" className="mt-3 w-full">
          <Link to="/student/today">{t("studentRailFallback.cta")}</Link>
        </Button>
      </RailCard>
    </aside>
  );
};

export default StudentFallbackRail;
