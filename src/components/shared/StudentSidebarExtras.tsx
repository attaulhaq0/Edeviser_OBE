import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Crown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLevel } from "@/hooks/useLevel";

/** Prototype student-only upgrade card and real XP/level progress. */
const StudentSidebarExtras = () => {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const level = useLevel(user?.id);
  const levelData = level.data;
  const progress = levelData?.progressPercent ?? 0;

  return (
    <div className="mt-auto space-y-2">
      <Link
        to="/student/marketplace"
        className="side-upgrade block rounded-[16px] border border-[#bfe6f5] bg-[linear-gradient(135deg,#f0fdfa,#eff6ff)] p-[14px_14px_15px] text-center no-underline"
      >
        <span className="su-ic mx-auto mb-2 flex size-[36px] items-center justify-center rounded-[11px] bg-[image:var(--brand-gradient)] text-[17px] text-white shadow-[0_4px_12px_rgba(3,130,189,0.3)]">
          <Crown className="size-4" aria-hidden="true" />
        </span>
        <p className="su-t mt-0 text-[13px] font-black text-[#075985]">
          {t("nav.upgradeToPremium")}
        </p>
        <p className="su-sub mx-0 mt-[5px] mb-[11px] text-[11px] font-medium leading-[1.4] text-[#0e7490] opacity-90">
          {t("nav.upgradeDescription")}
        </p>
        <span className="su-btn block rounded-[11px] bg-[image:var(--brand-gradient)] px-[9px] py-[9px] text-[12px] font-extrabold text-white shadow-[0_4px_12px_rgba(3,130,189,0.28)]">
          {t("nav.exploreRewards")}
        </span>
      </Link>

      <div
        className="rounded-[14px] border border-[#eef2f6] bg-[#f8fafc] px-3 py-2.5"
        aria-busy={level.isPending}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[11px] font-extrabold text-slate-700">
            {levelData
              ? t("header.profileSubtitle.studentLevel", {
                  level: levelData.level,
                  xp: levelData.xpTotal.toLocaleString(),
                })
              : t("nav.levelProgress")}
          </p>
          {levelData ? (
            <span className="shrink-0 text-[10px] font-bold text-slate-400">
              {levelData.progressPercent}%
            </span>
          ) : null}
        </div>
        <div
          className="side-lvlbar mt-1 h-[5px] overflow-hidden rounded-[3px] bg-slate-200"
          role="progressbar"
          aria-label={t("nav.levelProgress")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={levelData ? progress : undefined}
        >
          <div
            className="h-full rounded-[3px] bg-[image:var(--brand-gradient)] transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
        {levelData ? (
          <p className="side-lvltxt mt-0.5 text-[10px] text-slate-400">
            {levelData.xpTotal.toLocaleString()} /{" "}
            {levelData.xpForNextLevel.toLocaleString()} {t("nav.xp")}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default StudentSidebarExtras;
