import { Award, FileText, FolderOpen, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, RailCard, RailHead, RailRow } from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useTieredBadges } from "@/hooks/useTieredBadges";

const StudentProfileRail = () => {
  const { t } = useTranslation("student");
  const { user } = useAuth();
  const badges = useTieredBadges(user?.id);
  const portfolio = usePortfolio(user?.id);
  const latestBadge = badges.data?.[0];

  return (
    <aside
      aria-label={t("profilePage.rail.label")}
      className="hidden max-h-[calc(100vh-var(--app-header-h))] overflow-y-auto px-5 py-4 xl:sticky xl:top-[var(--app-header-h)] xl:col-start-3 xl:row-start-1 xl:block"
    >
      <div className="space-y-3">
        <RailCard>
          <RailHead title={t("profilePage.rail.latestBadge")} />
          <RailRow>
            <Award className="size-5 text-amber-600" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">
              {latestBadge?.name ?? t("profilePage.rail.noBadge")}
            </span>
          </RailRow>
          <Link
            to="/student/badges"
            className="mt-2 block text-xs font-bold text-blue-700 hover:underline"
          >
            {t("profilePage.rail.viewBadges", {
              count: badges.data?.length ?? 0,
            })}
          </Link>
        </RailCard>

        <RailCard>
          <RailHead title={t("profilePage.rail.academic")} />
          <RailRow>
            <FileText className="size-4 text-blue-700" aria-hidden="true" />
            <span className="flex-1">{t("profilePage.rail.transcript")}</span>
          </RailRow>
          <Button asChild variant="outline" size="sm" className="mt-2 w-full">
            <Link to="/student/transcript">
              {t("profilePage.rail.openTranscript")}
            </Link>
          </Button>
        </RailCard>

        <RailCard>
          <RailHead title={t("profilePage.rail.portfolio")} />
          <RailRow>
            <FolderOpen className="size-4 text-teal-700" aria-hidden="true" />
            <span className="flex-1">{t("profilePage.rail.evidence")}</span>
            <strong>
              {(portfolio.data?.clos.length ?? 0) +
                (portfolio.data?.badges.length ?? 0) +
                (portfolio.data?.journals.length ?? 0)}
            </strong>
          </RailRow>
          <Button asChild variant="tactile" size="sm" className="mt-2 w-full">
            <Link to="/student/portfolio">
              {t("profilePage.rail.openPortfolio")}
            </Link>
          </Button>
        </RailCard>

        <RailCard>
          <RailHead title={t("profilePage.rail.account")} />
          <RailRow>
            <WalletCards
              className="size-4 text-violet-700"
              aria-hidden="true"
            />
            <Link
              to="/student/fees"
              className="flex-1 font-semibold text-blue-700 hover:underline"
            >
              {t("profilePage.links.fees")}
            </Link>
          </RailRow>
        </RailCard>
      </div>
    </aside>
  );
};

export default StudentProfileRail;
