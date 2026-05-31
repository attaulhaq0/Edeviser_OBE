import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// English namespaces
import enCommon from "@/locales/en/common.json";
import enAuth from "@/locales/en/auth.json";
import enAdmin from "@/locales/en/admin.json";
import enTeacher from "@/locales/en/teacher.json";
import enStudent from "@/locales/en/student.json";
import enCoordinator from "@/locales/en/coordinator.json";
import enGamification from "@/locales/en/gamification.json";
import enAi from "@/locales/en/ai.json";

// Arabic namespaces
import arCommon from "@/locales/ar/common.json";
import arAuth from "@/locales/ar/auth.json";
import arAdmin from "@/locales/ar/admin.json";
import arTeacher from "@/locales/ar/teacher.json";
import arStudent from "@/locales/ar/student.json";
import arCoordinator from "@/locales/ar/coordinator.json";
import arGamification from "@/locales/ar/gamification.json";
import arAi from "@/locales/ar/ai.json";

import { applyDirection } from "@/lib/directionManager";

export const defaultNS = "common";
export const supportedLanguages = ["en", "ar"] as const;
export const namespaces = [
  "common",
  "auth",
  "admin",
  "teacher",
  "student",
  "coordinator",
  "gamification",
  "ai",
] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];
export type Namespace = (typeof namespaces)[number];

export const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    admin: enAdmin,
    teacher: enTeacher,
    student: enStudent,
    coordinator: enCoordinator,
    gamification: enGamification,
    ai: enAi,
  },
  ar: {
    common: arCommon,
    auth: arAuth,
    admin: arAdmin,
    teacher: arTeacher,
    student: arStudent,
    coordinator: arCoordinator,
    gamification: arGamification,
    ai: arAi,
  },
} as const;

const savedLang =
  typeof window !== "undefined"
    ? localStorage.getItem("edeviser-language")
    : null;

/**
 * Visible marker prepended to the resolved text when a key cannot be resolved
 * for the active language (R29.3a). The Arabic-speaking student must see that a
 * translation is missing rather than silently getting the raw key or English.
 */
export const MISSING_TRANSLATION_MARKER = "⚠ ";

/**
 * Reports a missing key / failed translation resolution. While the active
 * language is Arabic, a missing key or translation-service failure on an
 * internationalized page must be surfaced rather than silently rendering the
 * raw key or the English fallback (R29.3a). We:
 *   1. log it (always), and
 *   2. drop a Sentry breadcrumb when monitoring is initialized,
 * so the failure is observable in production without crashing the surface.
 */
const reportMissingTranslation = (
  lngs: readonly string[],
  ns: string,
  key: string
): void => {
  const active = (lngs[0] ?? "").split("-")[0];
  // Only Arabic users are guaranteed surfacing per R29.3a; for the English
  // base language a missing key is a development-time issue caught by the
  // en/ar key-parity audit instead.
  if (active !== "ar") return;

  const detail = `[i18n] missing translation: ns="${ns}" key="${key}" lng="${active}"`;
  if (typeof console !== "undefined") {
    console.error(detail);
  }

  // Best-effort Sentry breadcrumb; never let monitoring failures bubble up.
  void import("@sentry/react")
    .then((Sentry) => {
      if (Sentry.isInitialized()) {
        Sentry.addBreadcrumb({
          category: "i18n",
          level: "warning",
          message: detail,
        });
      }
    })
    .catch(() => {
      /* monitoring unavailable — the console error above is the fallback */
    });
};

i18n.use(initReactI18next).init({
  resources,
  lng: savedLang || "en",
  fallbackLng: "en",
  defaultNS,
  ns: [...namespaces],
  interpolation: {
    escapeValue: false, // React already escapes
  },
  pluralSeparator: "_",
  supportedLngs: ["en", "ar"],
  saveMissing: true,
  // Surface (don't silently swallow) missing keys / translation-service
  // failures while Arabic is active (R29.3a). The handler reports the gap and
  // returns a visibly-marked string so the user is never shown a bare key or a
  // silent English fallback masquerading as a real Arabic translation.
  parseMissingKeyHandler: (key, defaultValue) => {
    const active = (i18n.language ?? "").split("-")[0];
    if (active === "ar") {
      return `${MISSING_TRANSLATION_MARKER}${defaultValue ?? key}`;
    }
    return defaultValue ?? key;
  },
  missingKeyHandler: (lngs, ns, key) => {
    reportMissingTranslation(lngs, ns, key);
  },
});

// Apply direction on init and on every language change
applyDirection(i18n.language);
i18n.on("languageChanged", applyDirection);

export default i18n;
