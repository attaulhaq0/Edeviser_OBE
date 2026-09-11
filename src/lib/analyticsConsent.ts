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

  // Device class detection — desktop / tablet / mobile
  const deviceClass = ((): string => {
    const w = window.innerWidth;
    if (w < 640) return "mobile";
    if (w < 1024) return "tablet";
    return "desktop";
  })();

  // Release version from env, fallback to commit build hash pattern
  const releaseVersion =
    import.meta.env.VITE_APP_VERSION ??
    (import.meta.env.VITE_COMMIT_REF?.slice(0, 7) ?? "unknown");

  posthog.init(projectToken, {
    api_host: host,
    defaults: "2026-05-30",
    person_profiles: "identified_only",
    autocapture: true,
    capture_pageview: "history_change",
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "*",
    },
    // Super properties — attached to every event automatically
    loaded: (ph) => {
      ph.register_for_session({
        device_class: deviceClass,
        release_version: releaseVersion,
      });
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

  // Group analytics by institution for tenant-level metrics
  if (person.institutionId) {
    posthog.group("institution", person.institutionId, {
      name: person.institutionId,
    });
  }
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
