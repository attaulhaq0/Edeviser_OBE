# PostHog — Implementation Map

> Current state + target architecture for Edeviser's production intelligence.

---

## Current State

### SDK
| Detail | Value |
|---|---|
| Package | `posthog-js` v1.418.12 |
| Type | Client-side only (browser) |
| Init | `src/lib/analyticsConsent.ts` — `initAnalyticsIfConsented()` |
| Consent | Explicit cookie consent required (`edeviser_cookie_consent`) |

### Configuration
| Setting | Value |
|---|---|
| `api_host` | `VITE_POSTHOG_HOST` (us.i.posthog.com) |
| `defaults` | `2026-05-30` (official preset) |
| `person_profiles` | `identified_only` |
| `autocapture` | `true` |
| `capture_pageview` | `history_change` (SPA-safe) |
| `capture_exceptions` | Unhandled errors + rejections |
| `session_recording.maskAllInputs` | `true` |
| `session_recording.maskTextSelector` | `*` (all text masked) |

### Identity
| Aspect | Implementation |
|---|---|
| Distinct ID | `user.id` (Supabase UUID) |
| Person properties | email, name, role, institution_id |
| Account type | `seed` or `real` (via `isSeedAccount()`) |
| Environment | `production`, `preview`, `development` |
| Location | `src/providers/AuthProvider.tsx` — `identifyAuthenticatedUser()` |

### Current Events (via autocapture)
| Event | Source |
|---|---|
| `$pageview` | Autocapture via `history_change` |
| `$autocapture` | Click/form interactions |
| `$exception` | Unhandled errors/rejections |

### Custom Events
| Event | Source |
|---|---|
| *(scattered via `captureAnalyticsEvent()` calls)* | Various components |

---

## Gaps Identified

| Gap | Impact |
|---|---|
| No device class tracking | Cannot segment mobile vs desktop |
| No release version on events | Cannot attribute errors to releases |
| No group/tenant identification | Cannot segment by institution |
| No canonical event taxonomy | Events are ad-hoc, no governance |
| No workflow instrumentation | Cannot measure completion/abandonment |
| No route health tracking | Cannot identify failing routes |
| No feature flag usage | No progressive rollout capability |
| No experiments | No A/B testing for UI changes |
| No surveys | No qualitative user feedback |
| No performance tracking | No web vitals or load time data |

---

## Target Architecture

```
Application Layer
    │
    ▼
Analytics Contract (canonical events + properties)
    │
    ▼
PostHog Adapter (analyticsConsent.ts wrappers)
    │
    ▼
PostHog SDK (posthog-js)
```

### Key Principles
1. **Consent-gated** — no events without explicit opt-in
2. **Fail-safe** — analytics failures never block the application
3. **Privacy-first** — session replay masks all text; no PII in events
4. **Architecture-respecting** — no analytics in business-logic layers
5. **Canonical naming** — one event taxonomy enforced by lint

---

## Implementation Locations (Target)

| Concern | File |
|---|---|
| Analytics consent + init | `src/lib/analyticsConsent.ts` |
| Canonical event helpers | `src/lib/analyticsEvents.ts` (NEW) |
| Route tracking | `src/app/RoleAppShell.tsx` (via `usePageViewLogger`) |
| Workflow tracking | `src/features/{domain}/` |
| Device class detection | `src/lib/analyticsConsent.ts` (super properties) |
| Release identification | `VITE_APP_VERSION` env + super properties |
| Identity + properties | `src/providers/AuthProvider.tsx` |
| Feature flags | `src/lib/featureFlags.ts` (existing) |
| PostHog provisioning | `scripts/posthog-provision.mjs` |