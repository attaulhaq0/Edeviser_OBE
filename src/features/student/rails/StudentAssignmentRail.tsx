// =============================================================================
// StudentAssignmentRail — right rail for the student Assignment detail page
// (prototype `railHTML()` `page==='assignment'||'lesson'` case in shared.js):
//   Need a hand? · Similar past work · Have a perk?
//
// The prototype's two support cards are navigation prompts (AI Tutor + the
// Marketplace inventory) — reproduced here as real in-app links (no backend
// needed). GAP: "Similar past work" with per-assignment scores has no backing
// hook, so that card is omitted rather than fabricated (R17).
// =============================================================================

import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { RailCard, RailHead } from "@/design-system";

const RailLink = ({ to, label }: { to: string; label: string }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="mt-2 block text-xs font-extrabold text-blue-600 hover:underline"
    >
      {label}
    </button>
  );
};

const StudentAssignmentRail = () => {
  const { t } = useTranslation("student");

  return (
    <aside
      aria-label={t("assignment.rail.label", "Assignment help")}
      className="fixed bottom-0 end-0 top-14 z-30 hidden w-80 overflow-y-auto border-s border-border bg-white px-5 py-4 dark:bg-background xl:block"
    >
      {/* ── Need a hand? (AI Tutor) ── */}
      <RailCard>
        <RailHead title={t("assignment.rail.needHand", "🤖 Need a hand?")} />
        <p className="text-xs text-slate-600 dark:text-slate-300">
          {t(
            "assignment.rail.needHandBody",
            "The AI Tutor can walk through this step by step — no penalty for asking."
          )}
        </p>
        <RailLink
          to="/student/tutor"
          label={t("assignment.rail.askTutor", "Ask the Tutor →")}
        />
      </RailCard>

      {/* ── Have a perk? (Marketplace inventory) ── */}
      <RailCard>
        <RailHead title={t("assignment.rail.perk", "🎟️ Have a perk?")} />
        <p className="text-xs text-slate-600 dark:text-slate-300">
          {t(
            "assignment.rail.perkBody",
            "Extra-attempt or deadline-extension tokens live in your inventory."
          )}
        </p>
        <RailLink
          to="/student/marketplace"
          label={t("assignment.rail.openMarketplace", "Open Marketplace →")}
        />
      </RailCard>
    </aside>
  );
};

export default StudentAssignmentRail;
