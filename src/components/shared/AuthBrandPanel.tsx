// =============================================================================
// AuthBrandPanel — the prototype auth "brand / value" panel (auth.html)
// =============================================================================
//
// The left panel of the split auth layout: hero-gradient fill, decorative blob,
// logo mark + wordmark, headline, subtitle, three value bullets, and the
// FERPA / bilingual trust chips. Extracted so `LoginPage` and `AuthShell`
// (Reset / Update password) render one identical panel (no duplication).
//
// Presentation-only. Values are 1:1 from prototype/auth.html. Light + LTR
// (prototype scope; PARITY §E). Emoji chrome → Lucide per PARITY §B.
// =============================================================================

import { useTranslation } from "react-i18next";
import { Target, Bot, Flame, ShieldCheck, Globe } from "lucide-react";

const AuthBrandPanel = () => {
  const { t } = useTranslation("auth");

  return (
    <div className="auth-brand-panel relative overflow-hidden px-6 py-8 text-white md:flex md:flex-col md:justify-center md:px-12 md:py-[52px]">
      {/* Liquid background ambient lighting glow 1 */}
      <div
        className="pointer-events-none absolute -end-10 -top-12 h-64 w-64 rounded-full opacity-60 blur-xl"
        style={{
          background:
            "radial-gradient(circle, rgba(20,184,166,0.65) 0%, rgba(59,130,246,0.2) 60%, transparent 80%)",
        }}
      />
      {/* Liquid ambient lighting glow 2 */}
      <div
        className="pointer-events-none absolute -bottom-16 -start-12 h-60 w-60 rounded-full opacity-40 blur-2xl"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.5) 0%, rgba(20,184,166,0.15) 70%, transparent 90%)",
        }}
      />

      {/* ── BRAND / VALUE PANEL CONTENT ─────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-start">
        {/* Prominent Transparent Edeviser Logo Mark (Original logo without name) */}
        <div className="mb-6 flex items-center justify-center">
          <img
            src="/edeviser-logo-final.png"
            alt="Edeviser Logo Mark"
            className="h-24 w-auto object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)] transition-transform duration-300 hover:scale-105 md:h-28 lg:h-32"
          />
        </div>

        {/* Gamified + Institutional Badge */}
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-300/30 bg-teal-500/20 px-3.5 py-1 text-xs font-extrabold text-teal-200 backdrop-blur-md shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
          {t("brand.chipBilingual", "Bilingual OBE & Gamification Engine")}
        </div>

        <h2 className="text-2xl font-black leading-tight tracking-tight text-white drop-shadow-md md:text-3xl lg:text-4xl">
          {t("brand.headline", "Outcome-Based Higher Education")}
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-blue-100/90 font-medium">
          {t(
            "brand.subtitle",
            "Continuous evidence collection, real-time PLO/CLO attainment analytics, and Duolingo-style student engagement."
          )}
        </p>

        {/* Gamified + Institutional Feature Blocks */}
        <div className="mt-7 hidden space-y-3 md:block w-full max-w-md">
          <div className="flex items-center gap-3.5 rounded-2xl border border-white/15 bg-white/10 p-3 shadow-sm backdrop-blur-md transition-all hover:bg-white/15">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-300/30 bg-teal-500/25 shadow-inner">
              <Target className="h-5 w-5 text-teal-200" />
            </span>
            <div>
              <p className="text-xs font-extrabold text-white">
                Continuous Evidence Roll-Up
              </p>
              <p className="text-[11px] font-medium text-blue-100/75">
                Submission → CLO → PLO → ILO real-time chain
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl border border-white/15 bg-white/10 p-3 shadow-sm backdrop-blur-md transition-all hover:bg-white/15">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-300/30 bg-sky-500/25 shadow-inner">
              <Bot className="h-5 w-5 text-sky-200" />
            </span>
            <div>
              <p className="text-xs font-extrabold text-white">
                Socratic AI Tutor (Foxi)
              </p>
              <p className="text-[11px] font-medium text-blue-100/75">
                Bloom-guided adaptive learning feedback
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl border border-white/15 bg-white/10 p-3 shadow-sm backdrop-blur-md transition-all hover:bg-white/15">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-300/30 bg-amber-500/25 shadow-inner">
              <Flame className="h-5 w-5 text-amber-200" />
            </span>
            <div>
              <p className="text-xs font-extrabold text-white">
                Habit & Mastery Paths
              </p>
              <p className="text-[11px] font-medium text-blue-100/75">
                XP history, streaks, and skill tree rewards
              </p>
            </div>
          </div>
        </div>

        {/* Institutional Trust Seals */}
        <div className="mt-7 flex flex-wrap items-center gap-2 text-[11px] text-white/90">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 font-bold backdrop-blur-md shadow-sm">
            <ShieldCheck className="h-4 w-4 text-teal-300" />
            {t("brand.chipFerpa", "FERPA & GDPR Compliant")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 font-bold backdrop-blur-md shadow-sm">
            <Globe className="h-4 w-4 text-sky-300" />
            {t("brand.chipBilingual", "Qatar Higher Ed Standard")}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AuthBrandPanel;
