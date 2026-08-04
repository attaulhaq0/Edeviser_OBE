// Task 86.2: Analytics consent utilities
// Manages cookie consent state in localStorage for optional analytics integrations.

const CONSENT_KEY = "edeviser_cookie_consent";

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
};

export const hasAnalyticsConsent = (): boolean => {
  const consent = getConsent();
  return consent?.analytics === true;
};

export const initAnalyticsIfConsented = (): void => {
  // Consent is retained for analytics integrations that may be enabled later.
  // Do not load a replay/feedback SDK on every route just to honor consent.
  void hasAnalyticsConsent();
};
