import posthog from "posthog-js";
import { isSeedAccount } from "@/lib/seedAccounts";

const CONSENT_KEY = "edeviser_cookie_consent";
let analyticsInitialized = false;

export interface CookieConsent {
  essential: boolean;
  analytics: boolean;
}

export const getConsent = (): CookieConsent | null => {
  try {
    const localStorageData = localStorage.getItem(CONSENT_KEY);
    if (!localStorageData) return null;
    const parsed = JSON.parse(localStorageData) as CookieConsent;
    if (
      typeof parsed.essential !== "boolean" ||
      typeof parsed.analytics !== "boolean"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const setConsent = (consent: CookieConsent): void => {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  if (consent.analytics) {
    window.dispatchEvent(new Event("analytics-consent-granted"));
  }
};

export const hasAnalyticsConsent = (): boolean => {
  const consent = getConsent();
  return consent?.analytics === true;
};

/**
 * Deployment environment attached to every person + event. `VITE_ENV` may be set
 * per environment (e.g. Vercel preview vs production); otherwise fall back to the
 * Vite mode. Values: "production" | "preview" | "development".
 */
const resolveEnvironment = (): string => {
  const configured = import.meta.env.VITE_ENV;
  if (configured === "production" || configured === "preview")
    return configured;
  return import.meta.env.DEV ? "development" : "production";
};

export const initAnalyticsIfConsented = (): void => {
  if (!hasAnalyticsConsent() || analyticsInitialized) return;

  const projectToken = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN;
  const host = import.meta.env.VITE_POSTHOG_HOST;

  if (!projectToken || !host) {
    if (import.meta.env.DEV) {
      const missingVariable = !projectToken
        ? "VITE_POSTHOG_PROJECT_TOKEN"
        : "VITE_POSTHOG_HOST";
      throw new Error(
        `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`
      );
    }
    return;
  }

  posthog.init(projectToken, {
    api_host: host,
    // Official PostHog defaults preset (matches the install snippet).
    defaults: "2026-05-30",
    // Only create person profiles for identified users (via identify()).
    person_profiles: "identified_only",
    autocapture: true,
    // SPA-safe pageviews: react on History API navigations instead of full loads.
    capture_pageview: "history_change",
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
    // Privacy-first replay for an education product: mask every input and all
    // element text before capture. See docs/specs/continuous-verification/design.md.
    // NOTE: the key is `session_recording` in posthog-js 1.4xx (not `session_replay`).
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "*",
    },
  });
  analyticsInitialized = true;
};

export interface AnalyticsPerson {
  email?: string;
  fullName?: string;
  role?: string;
  institutionId?: string;
}

export const identifyAnalyticsUser = (
  distinctId: string,
  person: AnalyticsPerson
): void => {
  if (!hasAnalyticsConsent()) return;

  initAnalyticsIfConsented();
  if (!analyticsInitialized) return;

  const accountType = isSeedAccount(person.email, person.institutionId)
    ? "seed"
    : "real";

  posthog.identify(distinctId, {
    ...(person.email ? { email: person.email } : {}),
    ...(person.fullName ? { name: person.fullName } : {}),
    ...(person.role ? { role: person.role } : {}),
    ...(person.institutionId ? { institution_id: person.institutionId } : {}),
    account_type: accountType,
    environment: resolveEnvironment(),
  });
};

export const resetAnalyticsUser = (): void => {
  if (analyticsInitialized) posthog.reset();
};

export const captureAnalyticsEvent = (
  event: string,
  properties?: Record<string, boolean | number | string>
): void => {
  if (!hasAnalyticsConsent()) return;

  initAnalyticsIfConsented();
  if (!analyticsInitialized) return;

  posthog.capture(event, { ...properties, environment: resolveEnvironment() });
};
