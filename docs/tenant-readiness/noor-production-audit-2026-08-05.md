# Noor production audit and connected-seed dry-run

Status: **read-only; production seed not authorized**  
Captured: 2026-08-05 (Asia/Riyadh)  
Production project: `cdlgtbvxlxjpcddjazzx`

## Exact identity

The production row is named **Noor International School**, not “Noor International”.

| Field          | Verified value                                                   |
| -------------- | ---------------------------------------------------------------- |
| Institution ID | `4de6a0a2-758b-47f3-ab7e-984bb974d88b`                           |
| Exact name     | Noor International School                                        |
| Slug           | `noor-international`                                             |
| Join mode      | `invite_only`                                                    |
| Profiles       | 68: 1 Admin, 3 Coordinators, 4 Teachers, 40 Students, 20 Parents |

## Role and feature completeness

| Role        | Connected evidence                                                                                                   | Current gaps                                                                   |
| ----------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Admin       | settings 1; semester 1; departments 4; programs 4; 68 role-resolved profiles                                         | no invitations; future local invitation proof still required                   |
| Coordinator | outcomes 19; mappings 36; attainment 1,113; snapshots 19; CQI plans 3; accreditations 2; approvals 16                | reporting/RLS journeys still require local role testing                        |
| Teacher     | 4 assigned courses; 16 sections; 160 enrollments; 20 assignments; 552 submissions; 2 ungraded; 4,800 attendance rows | mutation/cache behavior still requires local proof                             |
| Student     | 4 courses; 4 upcoming assignments; 2 journals; 11 habit logs; 934 notifications; 348 activity rows                   | zero upcoming review schedules; only one habit row today; reminders are absent |
| Parent      | 20 verified links; linked-child attendance, assignments, grades, progress and habits exist                           | zero Parent reminders; denial/revocation journeys still require local proof    |

Current-date quality:

- 4 assignments are upcoming.
- Only 1 of 7 calendar events is current/future.
- All 5 review schedules are stale; none are upcoming.
- 285 activity rows are within the last 30 days.
- Two duplicate review-schedule rows exist under `(student_id, clo_id, review_date)`.
- No duplicate profile emails, enrollments, Parent links, or assignment titles per course were found.

## Existing seed ownership

Noor has one `development_seed_runs` row and 12 seed-entity markers:

| Entity type        | Marked rows |
| ------------------ | ----------: |
| assignment         |           1 |
| course             |           2 |
| course material    |           1 |
| course module      |           2 |
| discussion thread  |           1 |
| question           |           2 |
| submission         |           2 |
| Tutor conversation |           1 |

The existing production-specific scripts are not acceptable as the future operator path:

- they auto-load `.env.local`;
- they explicitly target production;
- one script performs deletes of title-matched assignments;
- several use `any` casts;
- the seed marker covers only a small subset of the connected graph;
- dynamic dates are not consistently owned and reconciled.

## Proposed deterministic seed additions

The replacement seed design must preserve all non-seed rows and operate only on deterministic IDs or existing seed-entity markers. Its production dry-run currently proposes:

| Action          | Proposed scope                                                                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Insert          | current/future calendar events, upcoming review schedules, meaningful reminders, current habit/activity fixtures, missing role dashboard support rows |
| Update          | seed-owned dynamic dates and statuses only; extend seed ownership markers to every managed row                                                        |
| Leave unchanged | all 68 profiles/Auth users, non-seed academic records, existing financial rows, manually created content, existing Storage contents                   |
| Block           | deletion of the two duplicate reviews until their ownership is proven; overwriting any row without a seed marker; any cross-tenant reference          |

Exact insert/update counts remain intentionally unclaimed until the replacement local seed planner runs against a clean Docker replay and again against its own second-run state.

## Production dry-run verdict

**BLOCKED FOR EXECUTION, READY FOR LOCAL DESIGN.** Noor has broad connected coverage, but its relative-date surfaces are stale or sparse, seed ownership is incomplete, and the current scripts are production-coupled. No production rows were changed.

### Local role verification blocker

The clean local replay provisions five explicit Noor fixture users and all five password authentications succeed. Each authenticated profile/data query then fails with `permission denied for table profiles`: the current migration baseline grants `authenticated` no table-level `SELECT` on `profiles` (and the connected core tables). This proven migration/grant defect blocks role routing, `/student/courses`, Parent-linked reads, and invitation UI verification until a separately reviewed Supabase migration restores table grants while retaining the existing RLS policies. No broad local grant was added and production was not changed.

The deterministic plan in `src/lib/noorSeedPlan.ts` remains dry-run-only. It proposes only missing date-sensitive calendar/review/reminder coverage, preserves meaningful existing records, and blocks operational invitation/token writes.
