import posthog from "posthog-js";

const CONSENT_KEY = "edeviser_cookie_consent";
let analyticsInitialized = false;

export interface CookieConsent {
  essential: boolean;
  analytics: boolean;
}

export const getConsent = (): CookieConsent | null => {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
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
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
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

  posthog.identify(distinctId, {
    ...(person.email ? { email: person.email } : {}),
    ...(person.fullName ? { name: person.fullName } : {}),
    ...(person.role ? { role: person.role } : {}),
    ...(person.institutionId ? { institution_id: person.institutionId } : {}),
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

  posthog.capture(event, properties);
};
