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
import { Button } from "@/components/ui/button";

const RailLink = ({ to, label }: { to: string; label: string }) => {
  const navigate = useNavigate();
  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      onClick={() => navigate(to)}
      className="mt-2 h-auto px-0 text-xs font-extrabold text-blue-600"
    >
      {label}
    </Button>
  );
};

const StudentAssignmentRail = () => {
  const { t } = useTranslation("student");

  return (
    <aside
      aria-label={t("assignment.rail.label", "Assignment help")}
      className="hidden max-h-[calc(100vh-var(--app-header-h))] overflow-y-auto px-5 py-4 xl:sticky xl:top-[var(--app-header-h)] xl:col-start-3 xl:row-start-1 xl:block"
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
