# Institution-ready live-data design

## Purpose

Make the parent, teacher, coordinator, and admin experiences deployable for multiple institutions without fabricated UI data. Noor International is the sole designated demo institution and may contain a small, internally consistent set of representative records. Gulf Academy and every other institution show only records created through normal application workflows.

## Data boundaries

- Every read is scoped by the authenticated profile's `institution_id` and role.
- UI components never contain literal institution names, learner links, fees, payments, attendance values, announcements, notifications, or attainment metrics.
- Noor records are created through the production tables and the same service/hook contracts used by the application. The seed/provisioning operation is idempotent, limited to Noor's institution ID, and never overwrites user-created records.
- No records are created for Gulf Academy or other institutions. Missing data renders useful, role-appropriate empty states and normal creation links.
- Existing RLS policies remain the authorization boundary. New queries and any provisioner must be verified with cross-institution access checks.

## Parent experience

- Profile resolves institution name, linked learners, course count, attainment, and contact details from live records.
- Fees exposes current charges, payment history, totals, and status only when records exist. Otherwise it explains that no charges have been issued.
- Announcements and notifications use their existing live query hooks and show a truthful empty state when no institution-scoped records exist.
- Study consistency is a live aggregation of the learner's attendance and course activity. Its visual language matches the teacher attendance trend surface; it shows an explanatory insufficient-activity state instead of blank content.

## Teacher attendance redesign

- Replace the attendance screen's fragmented presentation with a blue, role-consistent trend workspace.
- Include overall attendance, weekly trend, course breakdown, at-risk learners, and an actionable no-records state.
- All cards derive from persisted attendance records; no synthetic in-component values are permitted.

## Shared role system

- Parent, teacher, coordinator, and admin use the same transparent or white-liquid-glass icon containers.
- Teacher, coordinator, and admin hero panels use the teacher blue palette.
- Toggle and compact action buttons use the established tactile blue treatment.
- Student pages are out of scope.

## Verification

- Search and remove hardcoded institution/profile values from in-scope surfaces.
- Validate Noor and Gulf Academy as separate authenticated institutions where possible; Noor sees only Noor records and Gulf Academy sees no Noor records.
- Exercise real creation-to-display paths for attendance, fees/payment history, announcements, notifications, and consistency inputs.
- Run lint, TypeScript, unit/property tests, and rendered desktop/mobile checks for changed role flows.
