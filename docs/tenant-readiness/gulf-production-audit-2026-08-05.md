# Gulf production audit and reset dry-run

Status: **BLOCKED — dry-run only**  
Captured: 2026-08-05 (Asia/Riyadh)  
Production project: `cdlgtbvxlxjpcddjazzx`  
No production rows, Auth users, Storage objects, functions, migrations, or secrets were changed.

## Identity gate

| Field          | Verified value                         |
| -------------- | -------------------------------------- |
| Institution ID | `9fb38246-8bad-4372-acf7-e2d17558f2d0` |
| Exact name     | Gulf Academy of Excellence             |
| Slug           | `gulf-academy`                         |
| Join mode      | `invite_only`                          |
| Settings       | Empty JSON object                      |
| Logo           | Present                                |

The project reference, ID, name, and slug all matched. The production migration-history table contains exactly 376 rows. Version labels extend to `20260823000022`; version labels are identifiers and are not a count.

## Aggregate inventory

| Domain                                                             |               Count | Classification                                                                      |
| ------------------------------------------------------------------ | ------------------: | ----------------------------------------------------------------------------------- |
| Auth users / profiles                                              |             51 / 51 | Auth identities match documented fixtures; profile ownership is not seed-manifested |
| Admin / Coordinator / Teacher / Student / Parent                   | 1 / 2 / 3 / 30 / 15 | Documented QA fixture roles                                                         |
| Departments / programs / courses / sections                        |       1 / 3 / 3 / 9 | Unknown operational provenance                                                      |
| Enrollments / class sessions                                       |            90 / 270 | Unknown operational provenance                                                      |
| Assignments / submissions / grades                                 |      12 / 309 / 309 | Unknown operational provenance                                                      |
| Attendance records                                                 |               2,700 | Unknown operational provenance                                                      |
| Rubrics / outcomes / mappings / attainment                         |   9 / 15 / 18 / 630 | Unknown operational provenance                                                      |
| Outcome snapshots                                                  |                  15 | Unknown operational provenance                                                      |
| Journals / study sessions                                          |               2 / 1 | Potentially manual; blocks reset                                                    |
| Habit logs / habit-tracking rows                                   |          29 / 1,290 | Unknown operational provenance                                                      |
| XP transactions / badges / gamification rows                       |     1,671 / 50 / 30 | Unknown operational provenance                                                      |
| Notifications / activity rows                                      |         418 / 1,090 | Recent activity exists; blocks reset                                                |
| Announcements / teams                                              |               1 / 1 | Potentially manual; blocks reset                                                    |
| Tutor conversations / LLM logs / usage rows                        |          15 / 7 / 5 | Potentially manual; blocks reset                                                    |
| Question-bank / quiz-generation rows                               |               2 / 3 | Unknown operational provenance                                                      |
| Marketplace items / XP purchases                                   |              11 / 9 | Seed-like but not seed-manifested                                                   |
| Invitations                                                        |                   0 | No reset action                                                                     |
| Fee accounts / legacy payments / invoices / allocations / receipts |   0 / 0 / 0 / 0 / 0 | No financial blocker found                                                          |
| Gulf-owned Storage objects                                         |                   0 | No Gulf tenant-path or Gulf-owner objects found                                     |
| Append-only audit rows                                             |                   6 | Retain; never delete or bypass controls                                             |

## Auth classification

- All 51 Auth emails and roles match the exact fixture patterns already documented in the repository. There are no unexpected domains or role/email combinations.
- All Auth users were created between 2026-05-20 05:49 and 05:51 UTC.
- 23 have never signed in; 8 signed in during the last 30 days; 2 signed in during the last 7 days. The latest sign-in was 2026-08-03.
- Auth identities can therefore be classified as confirmed QA/demo fixtures, but recent sign-in evidence must still be reviewed before deletion.
- Gulf has no `development_seed_runs` row and no `development_seed_entities` manifest. Operational records cannot be classified as disposable merely because the associated users use `.test` addresses.

Latest observed activity was 2026-08-03; latest notification activity was 2026-07-11. Assignment creation dates are from 2026-05-20 and the latest journal is from 2026-06-23. These dates support a demo interpretation but do not prove seed ownership.

## Storage manifest

Production Storage contains six objects globally: two avatars, one course material, one report, and two submissions. Four are under Noor paths; the two avatars have no profile owner and no tenant-identifying path. No object is owned by a Gulf profile or uses a Gulf tenant path. Object names and contents were not exported.

## Cross-tenant and duplicate checks

The read-only scan found zero mismatches for:

- Parent–Student links;
- student-to-course enrollments;
- course-to-teacher assignments;
- section-to-teacher assignments;
- submission-to-assignment/student ownership.

It found no duplicate Gulf profile emails, enrollments, Parent links, or assignment titles per course. This is evidence for the sampled critical relationships, not a claim that every possible polymorphic or JSON reference has been proven.

## Backup specification

Before any separately authorized reset:

1. Capture a transactionally consistent database backup and record its checksum, server/project reference, migration count, timestamp, and retention location.
2. Produce a tenant manifest containing counts and IDs only for every direct and indirect Gulf-owned table in the dependency map. Keep the manifest outside the PR if it contains user IDs.
3. Export Auth-user IDs and safe metadata only; never export password hashes, tokens, or private emails into the repository.
4. Inventory Storage metadata and checksums without downloading customer file contents into the repository.
5. Restore the backup into an isolated, non-production environment and rerun the dry-run before approval.
6. Record the approval identity, approved manifest checksum, run ID, exact confirmation token derivation, and rollback owner.

## Dependency-safe future reset plan

This plan is not executable in the current goal.

1. Revoke sessions for only manually approved, confirmed fixture Auth users.
2. Remove confirmed seed children first: receipts/allocations, grades/evidence, submissions, attendance, notification/activity rows, gamification, Parent links, enrollments, modules/material metadata, assignments/rubrics, sections/sessions, course/outcome mappings, courses, programs, and departments.
3. Retain append-only audit logs and add a safe reset-run event through the normal audit path.
4. Remove only Auth users and profiles named in the approved manifest.
5. Preserve the institution row, UUID, slug, approved branding, join mode, and settings.
6. Verify zero approved fixture rows remain, no non-approved rows changed, no cross-tenant references were created, and ordinary users cannot access retained audit history.
7. Leave Gulf invite-only with no invented Administrator address. A real first Administrator is a separate authorized onboarding action.

## Dry-run verdict

**BLOCKED.** The institution identity is correct, the Auth fixtures are recognizable, financial activity is zero, Storage has no Gulf objects, and sampled cross-tenant checks are clean. However, thousands of operational rows lack a seed-ownership manifest, recent test activity exists, and journals/announcements/Tutor content may be manually entered. A reviewer must classify the non-manifested groups before any execute authorization.
