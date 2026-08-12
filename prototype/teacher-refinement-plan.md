# Teacher refinement plan

## Scope and guardrails

This is an offline, hard-coded prototype refinement. Only `prototype/` is in scope. The existing staff shell, blue/teal palette, sidebar, header, cards, icons, and desktop density are retained.

## Content ownership

| Area | Owns | Does not repeat |
| --- | --- | --- |
| Dashboard | weekly story and next actions | full roster, risk scores, full curriculum page |
| Students | roster and exploration | priority queue |
| Student Triage | cross-student priority and reasons | roster table |
| Student detail | individual evidence | handoff queue |
| Handoffs | consented Tutor context | general attention list |
| Gradebook | assessment score and CLO evidence | grading decision queue |
| Grading | teacher review/release decisions | gradebook analytics |
| Curriculum | course/outcome design | dashboard overview |
| Profile | identity, preferences, autonomy | dashboard KPIs |

## Page audit

| Route | Purpose / primary question | Keep / change | Agentic capability / protected action | Rail / mobile |
| --- | --- | --- | --- | --- |
| `teacher-dashboard.html` | What needs attention today? | Keep momentum, triage, feedback, outcome and impact sections; remove time-saved and black-box-risk repetition. | Prepare intervention and feedback drafts; teacher approves sends/releases. | Today/inbox/next class; rail moves below feed. |
| `teacher-students.html` | Who is in my class and how are they progressing? | Convert from triage ranking to roster/exploration. | Summarize evidence; no automatic action. | Selected class and filters; rows become cards. |
| `teacher-triage.html` | Who needs attention, and why? | New focused priority queue with evidence drawer. | Draft an intervention; teacher approves activation. | Priority counts and policy. |
| `teacher-student-detail.html` | What evidence explains Sarah’s learning state? | New cross-role evidence view for the canonical student. | Draft check-in; teacher approves contact. | Compact evidence context. |
| `teacher-studio.html` | What can I create for this course? | New hub for Curriculum, Questions, Rubrics, Materials. | Draft course artifacts; teacher publishes. | Course/draft context. |
| `teacher-grade.html` | What assessment work is next? | New hub for grading, gradebook and attendance. | Draft feedback; teacher releases grades/feedback. | Queue and coverage context. |
| `teacher-curriculum.html` | Which CLO gap should content address? | Keep studio; make drafts clearly review-before-publish. | Curriculum draft; teacher publishes. | Course/module/draft count. |
| `teacher-questions.html` | Which questions test this outcome? | Keep bank; label generated questions as drafts. | Question draft; teacher publishes. | Outcome/approval context. |
| `teacher-rubrics.html` | How will evidence be assessed? | Keep builder; preserve human final decision. | Rubric draft; teacher saves/publishes. | Rubric/course context. |
| `teacher-materials.html` | What material is available to students? | Keep material library; publish remains protected. | Material draft; teacher publishes. | Course/material status. |
| `teacher-handoffs.html` | What did Tutor share with consent? | Add Sarah’s consented handoff and replace unsupported universal escalation wording. | Response draft; teacher sends. | Pending, consent, demo SLA. |
| `teacher-grading.html` | Why was feedback drafted and what must I decide? | Keep editor; replace alternate Sarah identity and clearly gate release. | Feedback draft; teacher approves release/score. | Queue/rubric/draft status. |
| `teacher-gradebook.html` | What assessment evidence contributes to CLO state? | Keep table; distinguish score from mastery and canonical Sarah. | Evidence summary only; teacher changes grades. | Course/coverage/needs grading. |
| `teacher-attendance.html` | What is today’s attendance record? | Keep human-controlled attendance; no AI editing. | Suggest follow-up only; teacher records attendance. | Today’s class/record state. |
| `teacher-profile.html` | Who is Prof. Ahmed and what is E Deviser permitted to prepare? | Keep preferences; remove dashboard duplication and use A2 guardrails. | Manage draft assistance; protected actions always ask. | No heavy rail. |

## Validation checklist

- Canonical Sarah is `Sarah Ahmed`, CS301 Database Design, 72% course progress, Normalization · CLO 3, 62% Developing, Assignment 3 / Normalize a Schema / Friday, 12-day study consistency, five daily-review cards.
- No risk percentages or unsupported AI-time-saved claims.
- Every draft makes its approval boundary explicit; no chain-of-thought or chat UI.
- All teacher routes, top-level hubs and major calls to action are navigable offline.
