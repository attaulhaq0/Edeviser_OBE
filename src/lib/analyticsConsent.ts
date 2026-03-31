// Task 86.2: Analytics consent utilities
// Manages cookie consent state in localStorage and conditionally initializes Sentry

const CONSENT_KEY = 'edeviser_cookie_consent';

export interface CookieConsent {
  essential: boolean;
  analytics: boolean;
}

export const getConsent = (): CookieConsent | null => {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    if (typeof parsed.essential !== 'boolean' || typeof parsed.analytics !== 'boolean') {
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
  if (!hasAnalyticsConsent()) return;

  // Lazily initialize Sentry only when analytics consent is granted
  import('@sentry/react')
    .then((Sentry) => {
      if (Sentry.isInitialized()) return;
      Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: import.meta.env.MODE,
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 1.0,
      });
    })
    .catch((err) => {
      console.error('[analyticsConsent] Failed to initialize Sentry:', err);
    });
};
