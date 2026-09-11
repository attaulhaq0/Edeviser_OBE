# PostHog — Data Governance

> What Edeviser collects, what it never collects, and why.

---

## Consent Model

PostHog is initialized ONLY after explicit cookie consent (`edeviser_cookie_consent.analytics === true`). Before consent, zero data is sent to PostHog.

---

## What IS Collected

| Data | Purpose |
|---|---|
| User role (admin/coordinator/teacher/student/parent) | Role-based product analytics |
| Institution ID | Tenant segmentation |
| Account type (seed/real) | Filter test accounts from production metrics |
| Environment (production/preview/development) | Environment-specific analysis |
| Route paths | Page usage analytics |
| Feature/workflow names | Feature adoption measurement |
| Error types and status codes | Production reliability |
| Device class (desktop/tablet/mobile) | Responsive health |
| Browser/OS (autocapture defaults) | Device compatibility |
| Session recordings (all text masked) | UX investigation |

## What is NEVER Collected

| Data | Reason |
|---|---|
| Passwords or credentials | Security |
| Auth tokens or session keys | Security |
| Student grades or scores | Privacy |
| Free-text form input content | PII risk |
| Payment information | PCI compliance |
| Personal email content | Privacy |
| Raw chat/conversation content | Privacy |
| IP addresses (PostHog default) | Privacy |
| Geo-location beyond country (PostHog default) | Privacy |

## What is PARTIALLY Collected (Masked)

| Data | Protection |
|---|---|
| Session replay text | ALL text masked via `maskTextSelector: "*"` |
| Session replay inputs | ALL inputs masked via `maskAllInputs: true` |
| Page titles | Excluded from replay via `maskTextSelector` |
| User email | Only as person property (not in event payloads) |
| User name | Only as person property (not in event payloads) |

---

## Environment Rules

| Environment | PostHog Project | Behavior |
|---|---|---|
| Production | `edeviser-prod` | Real users, real data |
| Preview | `edeviser-qa` (393668) | Test deployments |
| Development | `edeviser-qa` (393668) | Local development |

Seed account events are FILTERED from PostHog dashboards via `account_type = seed`.

---

## Retention

| Data Type | Retention |
|---|---|
| Events | PostHog project default |
| Session recordings | 30 days (recommended) |
| Person profiles | Indefinite (identified users) |

## Access Control

| Role | PostHog Access |
|---|---|
| Engineering lead | Admin |
| Engineers | Editor |
| Product | Viewer |
| External | None |

---

## Compliance

- ✅ GDPR: Consent-gated, no PII collection, right to deletion via person profiles
- ✅ Education privacy: No student grades, no assessment data in analytics
- ✅ Cookie consent: Explicit opt-in before any analytics initialization
- ✅ Session replay: All text/inputs fully masked before capture

## Audit Trail

PostHog configuration changes are tracked via PostHog's built-in activity log.