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
import { Target, Bot, Flame, ShieldCheck, Globe, Sparkles } from "lucide-react";

const AuthBrandPanel = () => {
  const { t } = useTranslation("auth");

  return (
    <div className="auth-brand-panel relative overflow-hidden px-[22px] py-[26px] text-white md:flex md:flex-col md:justify-center md:px-12 md:py-[52px]">
      {/* Decorative blob */}
      <div
        className="pointer-events-none absolute -end-[30px] -top-[40px] h-[180px] w-[180px] rounded-full opacity-50 blur-[2px]"
        style={{
          background:
            "radial-gradient(circle, rgba(20,184,166,.5), transparent 70%)",
        }}
      />

      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/15">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-lg font-black">Edeviser</span>
        </div>

        <h2 className="mt-5 text-2xl font-black leading-tight tracking-tight md:text-3xl">
          {t("brand.headline")}
        </h2>
        <p className="mt-2 max-w-xs text-sm text-white/75">
          {t("brand.subtitle")}
        </p>

        <div className="mt-5 hidden space-y-2.5 md:block">
          <div className="flex items-center gap-2.5 text-sm text-white/90">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15">
              <Target className="h-4 w-4" />
            </span>
            {t("brand.bulletOutcomes")}
          </div>
          <div className="flex items-center gap-2.5 text-sm text-white/90">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15">
              <Bot className="h-4 w-4" />
            </span>
            {t("brand.bulletTutor")}
          </div>
          <div className="flex items-center gap-2.5 text-sm text-white/90">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15">
              <Flame className="h-4 w-4" />
            </span>
            {t("brand.bulletHabits")}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 text-[11px] text-white/70">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/[0.12] px-2.5 py-1 font-semibold">
            <ShieldCheck className="h-3 w-3" />
            {t("brand.chipFerpa")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/[0.12] px-2.5 py-1 font-semibold">
            <Globe className="h-3 w-3" />
            {t("brand.chipBilingual")}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AuthBrandPanel;
