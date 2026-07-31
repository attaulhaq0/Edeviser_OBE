import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Crown } from "lucide-react";

/** Prototype student-only upgrade card. */
const StudentSidebarExtras = () => {
  const { t } = useTranslation("common");

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
    </div>
  );
};

export default StudentSidebarExtras;
