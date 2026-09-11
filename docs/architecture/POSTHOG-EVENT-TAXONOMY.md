# PostHog — Event Taxonomy

> Canonical event naming conventions and property schemas for Edeviser.

---

## Naming Convention

```
{object}_{action}_{result}
```

Examples: `page_viewed`, `workflow_completed`, `form_validation_failed`

ALL events follow `snake_case`. No camelCase, PascalCase, or kebab-case.

---

## Standard Properties (every event)

| Property | Type | Values | Source |
|---|---|---|---|
| `role` | string | admin, coordinator, teacher, student, parent | `identifyAnalyticsUser` |
| `environment` | string | production, preview, development | `analyticsConsent.ts` |
| `account_type` | string | seed, real | `isSeedAccount()` |
| `device_class` | string | desktop, tablet, mobile | (NEW — super property) |
| `release_version` | string | git SHA or version | (NEW — VITE_APP_VERSION) |

---

## Core Events

### Page & Navigation

| Event | Trigger | Properties |
|---|---|---|
| `page_viewed` | Route change (autocapture) | `route`, `role`, `device_class` |

### Authentication

| Event | Trigger | Properties |
|---|---|---|
| `auth_login_succeeded` | Successful login | `role` |
| `auth_login_failed` | Failed login attempt | `error_type` |
| `auth_logout` | User logs out | — |
| `auth_session_expired` | Session expires | — |

### Workflows

| Event | Trigger | Properties |
|---|---|---|
| `workflow_started` | Major workflow begins | `workflow_name`, `role` |
| `workflow_completed` | Workflow succeeds | `workflow_name`, `duration_ms` |
| `workflow_failed` | Workflow error | `workflow_name`, `error_type` |
| `workflow_abandoned` | User leaves mid-workflow | `workflow_name`, `step_reached` |

### Forms

| Event | Trigger | Properties |
|---|---|---|
| `form_started` | Form is opened | `form_name` |
| `form_submitted` | Form submits successfully | `form_name` |
| `form_validation_failed` | Client-side validation fails | `form_name`, `field_count` |
| `form_submission_failed` | Server rejects submission | `form_name`, `error_code` |

### Errors

| Event | Trigger | Properties |
|---|---|---|
| `route_load_failed` | Route fails to load | `route`, `error_type` |
| `api_request_failed` | API call fails | `route`, `status_code`, `endpoint` |
| `authorization_denied` | User hits 403 | `route`, `required_role` |

### Feature Usage

| Event | Trigger | Properties |
|---|---|---|
| `feature_started` | User opens a feature | `feature_name`, `role` |
| `feature_completed` | Feature action succeeds | `feature_name` |
| `empty_state_seen` | Zero-data view rendered | `route`, `entity_type` |
| `error_state_seen` | Error boundary renders | `route` |

---

## Anti-Patterns (NEVER capture)

| Don't | Why |
|---|---|
| `button_clicked` | Too generic — use autocapture or workflow events |
| `page_scrolled` | High volume, low value |
| `element_hovered` | Meaningless noise |
| `component_rendered` | Internal implementation detail |
| Password/token/credential values | Security/privacy |
| Free-text form input content | PII risk |
| Student PII beyond role identification | Privacy regulation |

---

## Property Value Constraints

| Property | Allowed |
|---|---|
| `role` | `admin`, `coordinator`, `teacher`, `student`, `parent` |
| `device_class` | `desktop`, `tablet`, `mobile` |
| `environment` | `production`, `preview`, `development` |
| `account_type` | `seed`, `real` |
| `error_type` | `network`, `auth`, `validation`, `server`, `unknown` |