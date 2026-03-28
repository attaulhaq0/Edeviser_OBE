import * as Sentry from '@sentry/react';

/** Regex patterns matching common PII tokens in strings. */
const PII_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[email]' },
  { pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, replacement: '[uuid]' },
];

/** Scrub PII from a string value. */
export function scrubPII(value: string): string {
  let result = value;
  for (const { pattern, replacement } of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // FERPA/GDPR: strip PII from error events before they leave the browser
    beforeSend(event) {
      // Never attach user PII to Sentry events
      if (event.user) {
        delete event.user.email;
        delete event.user.username;
        delete event.user.ip_address;
      }

      // Scrub PII from exception messages
      if (event.exception?.values) {
        for (const ex of event.exception.values) {
          if (ex.value) ex.value = scrubPII(ex.value);
        }
      }

      return event;
    },

    // FERPA/GDPR: scrub PII from breadcrumbs (navigation, console, XHR)
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.message) {
        breadcrumb.message = scrubPII(breadcrumb.message);
      }
      // Strip query params from navigation breadcrumbs (may contain search terms with names)
      if (breadcrumb.category === 'navigation' && breadcrumb.data?.to) {
        const url = breadcrumb.data.to as string;
        const qIdx = url.indexOf('?');
        if (qIdx !== -1) breadcrumb.data.to = url.slice(0, qIdx);
      }
      return breadcrumb;
    },

    // Never send default PII (cookies, IP, user-agent fingerprinting)
    sendDefaultPii: false,
  });
}
