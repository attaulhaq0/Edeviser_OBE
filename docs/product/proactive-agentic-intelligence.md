# Proactive Agentic Intelligence - Initial Vertical Slice

## Purpose

Edeviser evaluates authorized learning evidence in the background. A user does not need to open Ask E Deviser for the system to recalculate a Student Learning State or prepare a role-appropriate artifact.

The initial production slice is deliberately deterministic. No LLM assigns a risk label, decides authorization, or executes a protected action.

## Schedule and worker

The existing `/api/cron/ai-at-risk-prediction` schedule remains the single 03:00 job. Its handler now invokes `supabase/functions/agent-worker` with `action = scheduled_scan`; no duplicate cron was added.

The worker:

- is disabled unless `AI_PROACTIVE_AGENTS_ENABLED=true`;
- recalculates state but does not create automatic low-risk artifacts unless `AI_AUTO_LOW_RISK_ENABLED=true`;
- accepts scheduled scans only from the managed server key or cron secret;
- processes a rotating, bounded student batch;
- keeps institution IDs on every query, artifact and audit entry;
- uses a seven-day cooldown and an evidence fingerprint to suppress unchanged conditions;
- creates at most three new teacher flags per teacher per run and one flag per student per run;
- treats unavailable attendance or habit evidence as `not_authorized`, not as a negative signal;
- records immutable evidence in `audit_logs` and role-scoped in-app artifacts in existing RLS-protected tables.

## Deterministic trigger

Version: `needs-attention/low-mastery-compounding-evidence/v1.0.0`

A Teacher Needs Attention flag is created only when both conditions are true:

1. current CLO mastery is below 60%; and
2. at least one additional observable condition exists:
   - mastery declined by at least 3 percentage points since the previous state;
   - no login for at least seven days;
   - recent submission pattern is `late` or `missed`;
   - authorized attendance frequency is below 65%; or
   - authorized study consistency is `low`.

`urgent` is used only when mastery is below 50% and at least two additional conditions contribute. The UI displays `Needs Attention`; it does not display an unexplained AI probability or risk score.

Every flag contains:

- contributing evidence and its source;
- the observed value and threshold;
- Student Learning State calculation version;
- trigger version;
- calculation and trigger timestamp;
- evidence IDs and stable evidence fingerprint;
- recommended next action;
- intervention draft;
- institution, student, course, CLO and required approver scope.

## Role routing

| Role        | Automatically created artifact                                     | Authorization rule                                                                                                                 |
| ----------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Student     | Prioritized in-app next action                                     | Created only after the assigned teacher approves the protected contact action                                                      |
| Teacher     | Needs Attention flag, intervention draft and pending approval item | Teacher must own the active course; A1 or higher may receive drafts                                                                |
| Parent      | In-app support-summary candidate                                   | Verified parent-student link, same institution, urgent trigger and preference/autonomy permit it; no external notification is sent |
| Coordinator | Recurring CLO/program warning and CQI draft                        | At least three distinct students in the assigned program cross the same CLO trigger; assigning CQI remains protected               |
| Admin       | Institutional evidence/data-health warning                         | Institution-scoped missing structured evidence is detected; the warning includes affected records and remediation guidance         |

Institution policy, role ceiling, user autonomy and user opt-out are combined by taking the lowest A0-A3 level. A3 never bypasses the protected-action list.

## Protected teacher action

The proactive intervention recommends `send_message`, which is protected.

1. The worker writes the evidence and pending proposal to an immutable audit entry.
2. The teacher receives an in-app approval item and sees the evidence, versions and draft.
3. Approval calls `agent-worker`; browser code does not insert the student notification.
4. The worker authenticates the teacher and revalidates institution, course ownership, autonomy, proposal status, current attainment and the deterministic trigger.
5. Only then does it create the student's in-app next action and an approval/execution audit entry.
6. Repeated approval is rejected because the proposal is no longer pending.

No email, external parent contact, planner session, goal, grade, attendance, assignment, deadline, outcome, mapping, CQI assignment or academic-record mutation is performed.

## Intervention outcome loop

Version: `intervention-outcome/mastery-delta/v1.0.0`

After the follow-up date, the worker waits for a newer attainment evidence timestamp. It compares follow-up CLO mastery with the baseline:

- `effective`: improvement of at least 5 percentage points;
- `regressed`: decline of at least 3 percentage points;
- `no_material_change`: all other deltas.

The result, calculation version, timestamp, mastery delta and recommended next action are appended to the intervention artifact and immutable audit log. The Student Learning State is then updated with the new mastery, trend and last intervention outcome.

## Proven flow

`src/__tests__/unit/proactiveIntelligence.test.ts` proves:

new evidence -> Student Learning State recalculation -> deterministic trigger -> Teacher Needs Attention flag contract -> intervention draft -> protected teacher approval contract -> student next action -> follow-up evidence -> intervention outcome -> updated Student Learning State.

Additional tests verify unchanged-evidence fingerprint stability, the no-single-signal rule, role routing, protected-action classification, autonomy ceilings and user opt-out.

## Rollback

Set `AI_PROACTIVE_AGENTS_ENABLED=false` to disable the worker, or set `AI_AUTO_LOW_RISK_ENABLED=false` to keep state recalculation while preventing new proactive artifacts. Existing immutable audit records and already-created in-app artifacts remain available for governance review.
