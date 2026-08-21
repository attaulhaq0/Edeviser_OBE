# E Deviser — Master Codex Goal
## Production Agentic Learning Operating System + OBE/ILO Remediation + Proactive Closed Loop

> **Use this as the primary implementation goal for Codex/Kiro.**
> Work autonomously through the repository and connected Supabase project. Do not stop after planning. Audit first, write/update the Kiro specifications, then implement in verified vertical slices until the Definition of Done is satisfied.

---

# 0. Operating Instruction to Codex

You are working inside the existing **E Deviser Platform** repository using Codex through Kiro.

Your mission is to transform the existing product into a **secure, role-aware, proactive, multi-agent learning operating system** across all five authenticated roles:

1. Student
2. Teacher
3. Parent
4. Coordinator
5. Admin

The final product must not feel like five unrelated dashboards and must not become a generic chatbot layered over the application.

The product must behave as one governed intelligence system that connects:

```text
Student activity
    ↓
Assessment / rubric evidence
    ↓
CLO attainment
    ↓
PLO contribution
    ↓
Derived ILO contribution / institutional outcome evidence
    ↓
Habit and behavioral context
    ↓
Agent detection of risks and opportunities
    ↓
Role-appropriate recommendation / draft / flag
    ↓
Human approval when the action is protected
    ↓
Controlled execution
    ↓
Result measurement
    ↓
Student Learning State update
    ↓
Teacher / Parent / Coordinator / Admin insight
    ↓
CQI and institutional improvement
    ↓
Updated student experience
```

## Autonomous execution rule

Do not repeatedly ask the user what to do next.

For normal repository work:

- inspect;
- document;
- implement;
- test;
- fix;
- continue to the next verified slice.

Only stop for a genuine hard blocker that cannot be resolved from the repository, live schema, connected tools, tests, or documentation, such as:

- a missing external credential that cannot be safely inferred;
- an unavailable external service required for a production verification step;
- an irreversible production decision for which no safe reversible migration/backup path exists.

When blocked on one item, document the blocker and continue all independent work that can still be completed.

Never invent credentials, secrets, data, APIs, database structures, or successful test results.

---

# 1. Source-of-Truth and Precedence

Use this order of truth:

1. **Current checked-out repository and repo instructions (`AGENTS.md`, README, package scripts).**
2. **Live Supabase schema, policies, functions, grants, data shape, and connected project state.**
3. **Current Kiro specifications.**
4. **This master goal.**
5. Generated codebase reports/audits only as supporting references.

Do **not** rely only on historical PDFs or generated codebase documentation.

If the repository's current `AGENTS.md` says migrations must be managed through Supabase MCP or another approved workflow, follow that rule. Do not manually bypass repo governance.

Before changing database objects, verify the live object first.

---

# 2. Existing Technology Baseline

Preserve and build on the current stack rather than introducing unnecessary infrastructure:

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Shadcn/UI
- TanStack Query
- React Router
- Supabase PostgreSQL
- Supabase Auth
- Supabase Row Level Security
- Supabase Edge Functions
- Supabase Storage
- Supabase pgvector
- Existing cron / scheduling infrastructure
- Existing OBE Engine
- Existing Habit Engine
- English and Arabic localization
- RTL support
- Playwright
- Visual regression tests
- Existing E Deviser design system and prototype references

DeepSeek must become the primary production generation provider.

Gemini must not remain required for normal production AI execution.

Do not add Pinecone at this stage.

---

# 3. Product Positioning

Implement E Deviser as:

> **A governed agentic learning operating system that connects outcome-based education, student evidence, habits, safe AI interventions, human approvals, curriculum improvement, and institutional accountability through one role-aware intelligence layer.**

The system should support the following maturity model simultaneously:

```text
LEVEL 1 — AI conversation
User asks → E Deviser answers.

LEVEL 2 — Context-aware intelligence
E Deviser knows the actor, role, institution, page, course/program, selected entity, outcomes, evidence, habits and permissions.

LEVEL 3 — Tool-using specialist agents
E Deviser can retrieve authorized facts, search approved course knowledge, analyze evidence, draft actions and invoke narrowly scoped tools.

LEVEL 4 — Closed-loop agentic system
E Deviser can detect meaningful signals proactively, route them to the correct role, recommend/draft the next action, request approval where required, execute approved actions, measure outcomes and update future recommendations.
```

**Level 4 is the target architecture.**

---

# 4. Mandatory Kiro Spec-Driven Process

Create or maintain:

```text
.kiro/specs/edeviser-agentic-intelligence/
├── research.md
├── current-state-audit.md
├── requirements.md
├── design.md
├── architecture.md
├── data-model.md
├── security-model.md
├── autonomy-policy.md
├── tool-registry.md
├── page-capability-matrix.md
├── api-contracts.md
├── frontend-plan.md
├── migration-plan.md
├── evaluation-plan.md
├── rollout-plan.md
├── tasks.md
├── traceability.md
│
├── obe-hierarchy-audit.md
├── ilo-frontend-backend-audit.md
├── outcome-mapping-direction-audit.md
├── outcome-security-remediation.md
├── outcome-data-reconciliation.md
└── outcome-agent-capabilities.md
```

Canonical Kiro files:

- `requirements.md`
- `design.md`
- `tasks.md`

All supporting files must remain synchronized with those canonical files.

Do not mark a Kiro task complete until its implementation and required tests pass.

---

# 5. Mandatory First Phase — Repository + Live Supabase Audit

Before broad implementation, inspect the actual repository and live Supabase project.

At minimum inspect:

```text
AGENTS.md
README.md
package.json
.env.example
current route definitions
existing auth/role guards
existing TanStack Query hooks
existing Supabase Edge Functions
existing tutor / AI code
existing RAG code
existing cron / queue / scheduler code
existing notifications
existing task/planner/goal code
existing audit logging
existing feature flags
existing localization
existing E2E and RLS tests
```

Outcome-specific minimum audit:

```text
src/hooks/useILOs.ts
src/hooks/usePLOs.ts
src/hooks/useCLOs.ts
src/hooks/useOutcomeChain.ts
src/lib/outcomeChain.ts
src/lib/schemas/ilo.ts
src/lib/schemas/plo.ts
src/lib/schemas/clo.ts
src/pages/admin/outcomes/ILOListPage.tsx
src/pages/admin/outcomes/ILOForm.tsx
Coordinator outcome / curriculum pages
Teacher CLO / assignment / rubric / gradebook pages
attainment rollup functions
outcome migrations
outcome RLS
mapping-weight validation
CQI queries
accreditation queries
audit logs
```

Inspect live Supabase objects including, where present:

```text
profiles
institutions
programs
courses
course_sections
student_courses / enrollments
assignments
rubrics
submissions
evidence
learning_outcomes
outcome_mappings
outcome_attainment
graduate_attributes
graduate_attribute_mappings
habit-related tables
study/planner tables
notifications
parent_student_links
cqi_plans
course_material_embeddings
AI/tutor tables
```

Audit:

- columns and enums;
- constraints;
- foreign keys;
- indexes;
- triggers;
- RPCs/functions;
- function security mode;
- search paths;
- grants;
- RLS status and policies;
- cross-institution isolation;
- existing records;
- orphaned records;
- duplicate/mirrored mappings;
- incorrect mapping directions;
- invalid outcome type/scope combinations;
- weight totals;
- existing schedules;
- existing notification flows;
- existing AI provider assumptions.

Write findings before changing data.

---

# 6. Canonical OBE Hierarchy and Ownership

The intended responsibility model is:

```text
Admin
  Owns institutional ILO definition and governance

Coordinator
  Owns program PLO definition
  Maps PLOs to institution ILOs
  Reviews program attainment
  Owns CQI and accreditation workflow

Teacher
  Owns CLO / Sub-CLO definitions for assigned courses
  Maps CLOs to PLOs
  Connects assignments/rubrics/evidence to CLOs

Student
  Produces learning evidence
  Sees authorized personal mastery/alignment explanations

Parent
  Sees authorized summaries for verified linked children
```

Canonical hierarchy:

```text
Institution
  └── ILO
      └── PLO
          └── CLO
              └── Sub-CLO (where supported)
                  └── Assessment / Rubric / Evidence
```

Graduate Attributes may remain in their dedicated structure where the current architecture requires them.

### Canonical mapping direction

Audit first. If safe and consistent with the live design, standardize to:

```text
source_outcome_id = parent / higher level
target_outcome_id = child / lower level

ILO → PLO
PLO → CLO
CLO → SUB_CLO
```

Do not allow both directions to remain in production.

Reconcile historical rows safely, transactionally where possible, with backups/rollback and before/after counts.

Do not silently delete valid relationships.

---

# 7. Outcome Security Remediation

Outcome authorization must be enforced by database policy and tool handlers, never by model judgment.

## Admin

May manage ILOs inside own institution.

Admin must not accidentally mutate PLO/CLO records by passing an arbitrary ID through an ILO form/tool.

## Coordinator

May:

- read institution ILOs;
- manage PLOs only for assigned programs;
- map assigned-program PLOs to ILOs;
- review assigned-program attainment;
- draft CQI.

Must not:

- create/edit ILOs;
- mutate another coordinator's program;
- map across institutions.

## Teacher

May:

- read relevant ILO/PLO alignment;
- manage CLO/Sub-CLO only for assigned courses;
- map authorized CLOs to authorized PLOs;
- review authorized attainment.

Must not edit ILO/PLO definitions or other teachers' courses.

## Student and Parent

Read-only for official outcome definitions.

## RLS rules

Prefer explicit role/type policies rather than one broad permissive `FOR ALL` policy.

Use `USING` and `WITH CHECK` correctly.

Do not authorize from user-editable metadata.

Review all `SECURITY DEFINER` functions, execution grants and safe `search_path` handling.

Prefer `SECURITY INVOKER` where possible.

---

# 8. Shared Multi-Agent Architecture

Implement one authenticated orchestrator:

```text
supabase/functions/agent-orchestrator/
```

Implement one background worker:

```text
supabase/functions/agent-worker/
```

Create/reuse a shared AI architecture similar to:

```text
supabase/functions/_shared/ai/
├── providers/
│   ├── deepseek.ts
│   ├── mock-provider.ts
│   └── types.ts
├── orchestration/
│   ├── orchestrator.ts
│   ├── route-agent.ts
│   ├── execute-tool-loop.ts
│   ├── context-builder.ts
│   └── response-builder.ts
├── agents/
│   ├── tutor-agent.ts
│   ├── mastery-agent.ts
│   ├── habit-agent.ts
│   ├── risk-agent.ts
│   ├── intervention-agent.ts
│   ├── teacher-agent.ts
│   ├── parent-agent.ts
│   ├── coordinator-agent.ts
│   ├── admin-agent.ts
│   └── evaluator-agent.ts
├── tools/
│   ├── registry.ts
│   ├── student-tools.ts
│   ├── teacher-tools.ts
│   ├── parent-tools.ts
│   ├── coordinator-tools.ts
│   ├── admin-tools.ts
│   └── outcome-tools.ts
├── policy/
│   ├── permissions.ts
│   ├── autonomy.ts
│   ├── approvals.ts
│   ├── protected-actions.ts
│   ├── outcome-governance.ts
│   ├── data-classification.ts
│   └── academic-integrity.ts
├── context/
│   ├── actor-context.ts
│   ├── page-context.ts
│   ├── institution-context.ts
│   ├── outcome-context.ts
│   ├── student-learning-state.ts
│   ├── conversation-memory.ts
│   └── retrieval-context.ts
└── observability/
    ├── logger.ts
    ├── cost-tracker.ts
    ├── redaction.ts
    └── metrics.ts
```

Adapt names to the repository if equivalent modules already exist.

**Do not create unrestricted agents that freely communicate.**

Use one orchestrator with narrowly controlled specialists and typed tools.

---

# 9. What the Orchestrator Must Do

For every interactive or background agent run, construct an `AgentContext` from authoritative data.

It should understand, when applicable:

- authenticated actor;
- role;
- institution;
- assigned program/course scope;
- current route/page;
- selected entity;
- selected student;
- selected program/course;
- ILO/PLO/CLO/Sub-CLO context;
- assessment/rubric/evidence context;
- Student Learning State;
- habit context;
- previous interventions and outcomes;
- tutor autonomy;
- operational autonomy;
- institution policy;
- role policy;
- page policy;
- tool policy;
- approval requirement;
- relevant RAG/retrieval context.

Then:

```text
Context
  ↓
Route to specialist agent
  ↓
Select only authorized typed tools
  ↓
Execute bounded tool loop
  ↓
Evaluator/safety/policy check
  ↓
Answer / suggestion / draft / proposal
  ↓
Approval workflow if protected
  ↓
Controlled execution
```

The orchestrator is not a separate paid AI model. It is application logic controlling model/tool use.

---

# 10. Specialist Agents

## Tutor Agent

- course explanation;
- approved RAG;
- CLO context;
- L1/L2/L3 tutor autonomy;
- diagnostic questions;
- practice;
- academic integrity;
- independence nudges;
- teacher-handoff suggestions.

## Mastery Agent

- CLO analysis;
- PLO contribution;
- derived ILO alignment;
- prerequisite/competency gaps;
- evidence sufficiency/confidence;
- trends;
- outcome-chain explanation.

## Habit Agent

- study consistency;
- streaks;
- study sessions;
- missed sessions;
- effective session duration;
- preferred timing;
- late submission patterns;
- intervention acceptance/recovery.

## Risk Agent

- deterministic, evidence-backed educational risk/opportunity signals;
- combines OBE evidence and habit/activity evidence;
- no invented black-box probabilities;
- records contributing signals and calculation version.

## Intervention Agent

- selects safe next learning/support actions;
- uses prior intervention outcomes;
- generates suggestions and drafts;
- creates approval proposals for protected actions;
- never bypasses approval policy.

## Teacher Agent

- assigned-course students;
- Today's Attention / priority signals;
- misconceptions;
- CLO/PLO/ILO chain;
- feedback drafts;
- intervention drafts;
- question generation;
- lesson adaptation;
- tutor handoffs.

## Parent Agent

- verified linked-child summary;
- meaningful weekly changes;
- deadlines;
- authorized attendance context;
- support suggestions;
- privacy-aware explanation;
- no exposure of private tutor/journal/internal governance data unless policy explicitly allows it.

## Coordinator Agent

- PLO/ILO alignment;
- program trends;
- outcome gaps;
- curriculum coverage;
- evidence sufficiency;
- CQI drafts;
- accreditation readiness/evidence organization.

## Admin Agent

- ILO governance;
- institution/program health;
- OBE quality;
- mapping quality;
- evidence coverage;
- CQI closure;
- AI governance;
- AI cost;
- safety/adoption;
- setup/data completeness;
- draft institutional reports/evidence packs.

## Evaluator Agent

- authorization result;
- evidence grounding;
- citation support;
- academic integrity;
- tool correctness;
- approval-policy correctness;
- response safety.

---

# 11. Tool Safety — Non-Negotiable

No agent may receive:

- arbitrary SQL;
- arbitrary table access;
- generic query tools accepting a table name;
- service-role credentials;
- database credentials;
- raw SQL execution tools;
- tools capable of bypassing role policy.

Every tool must be typed and declare equivalent metadata to:

```ts
interface AgentTool<TInput, TOutput> {
  name: string;
  description: string;
  allowedRoles: EdeviserRole[];
  actionType: "read" | "suggest" | "draft" | "write";
  approval:
    | "none"
    | "actor"
    | "student"
    | "teacher"
    | "coordinator"
    | "admin";
  dataCategories: string[];
  inputSchema: ZodSchema<TInput>;
  execute(input: TInput, context: AgentContext): Promise<TOutput>;
}
```

Authorization must be enforced in the tool handler + Supabase RLS/RPC layer.

Never accept an LLM statement such as "the user is allowed" as authorization.

---

# 12. Tutor Autonomy vs Operational Autonomy

Keep these separate.

## Pedagogical Tutor Autonomy

```text
L1 — hints only
L2 — guided discovery
L3 — direct explanation
```

## Operational Agent Autonomy

```text
A0 — observe only
A1 — suggest and draft
A2 — confirm before action
A3 — automatically execute only approved low-risk actions
```

Effective autonomy is the minimum of:

- institution ceiling;
- role ceiling;
- page ceiling;
- tool ceiling;
- user preference;
- teacher/coordinator ceiling where applicable.

Users may lower autonomy but may never exceed policy ceilings.

A3 **never** bypasses protected-action approval rules.

---

# 13. Proactive Agent Behavior — Mandatory

The agentic system must not depend only on users opening **Ask E Deviser**.

Use the background worker and existing scheduling/event infrastructure so E Deviser can notice meaningful changes proactively.

Evaluate authorized signals such as:

- new grade/rubric evidence;
- CLO attainment changes;
- missing or weak evidence;
- assignment deadlines;
- late/missing submissions;
- authorized attendance changes;
- study-session completion/misses;
- habit/streak changes;
- intervention outcomes;
- repeated class/program-level patterns;
- outcome mapping/evidence-quality issues;
- institution governance/data-health issues.

Use deterministic rules/SQL/business logic where possible. Do not waste LLM calls to calculate things that can be calculated reliably in code or SQL.

The LLM may explain, summarize, prioritize or draft; it should not invent the trigger itself.

## Proactive routing

### Student

Automatically surface:

- prioritized next action;
- recommended resource;
- diagnostic prompt;
- suggested study session;
- draft plan;
- learning-state explanation.

### Teacher

Automatically surface a **Today's Attention** item when authorized evidence crosses a documented trigger.

Every flag must explain why, using real contributing signals.

### Parent

Generate authorized summary candidates and support suggestions, respecting verified links and privacy policy.

### Coordinator

Detect repeated CLO/PLO/program patterns and surface curriculum/evidence gaps and CQI drafts.

### Admin

Surface institution-level outcome health, evidence gaps, mapping/data-quality warnings, governance/safety/cost alerts and pending approvals.

## Flag requirements

Every proactive flag/task/suggestion must record or be reproducible from:

- institution;
- subject entity/student;
- trigger type;
- trigger/calculation version;
- evidence snapshot/references;
- timestamp;
- severity/priority using deterministic policy;
- recommended next action;
- destination role;
- deduplication key;
- cooldown state;
- final resolution/outcome.

Do not repeatedly notify the same unchanged condition.

Use cooldowns, deduplication, idempotency and rate limits.

---

# 14. Automatic Actions vs Protected Actions

## Initially automatic when policy permits

The system may automatically:

- display an in-app suggestion;
- flag a student for the appropriate teacher;
- show a proactive card;
- recommend an approved resource;
- offer a diagnostic question;
- suggest a study session **without creating it**;
- suggest a goal **without creating it**;
- create a draft learning plan;
- create draft feedback;
- create a draft intervention;
- create draft reports/evidence-pack content;
- explain ILO/PLO/CLO relationships;
- display outcome-governance warnings;
- display mapping/data-quality warnings;
- create a pending approval proposal;
- place pending proposals/handoffs/follow-ups into the correct role's task inbox.

## Always approval-required in initial release

The system must not execute these without the required human approval:

- add a planner/study session;
- create an actual goal;
- contact a teacher;
- notify a parent;
- send an email;
- send a message to another person;
- create/modify an assignment;
- publish course content;
- publish generated questions;
- create/update/delete/reorder an ILO;
- create/update a PLO;
- create/update a CLO;
- change an outcome mapping;
- create/assign an official CQI action;
- change a deadline;
- change a grade;
- release grades;
- modify attendance;
- modify official attainment;
- modify an academic record;
- change roles;
- change permissions;
- delete users;
- change institutional policies;
- make financial changes;
- publish institution-wide communications.

---

# 15. Who Approves What

Encode the actual approver in the page-capability matrix/tool registry. Do not let the LLM choose the approver dynamically.

Typical policy:

```text
Student-owned personal action
  → Student approval

Teacher intervention / feedback / course action
  → Assigned Teacher approval

Program PLO / mapping / CQI action
  → Assigned Coordinator approval

Institution ILO / institution policy / role-permission / institution-wide action
  → Admin approval
```

Examples:

- add recommended study session to a student's planner → Student;
- create student's actual goal → Student;
- student tutor handoff/contact teacher → Student consent first, then Teacher controls any academic intervention;
- activate teacher intervention → Teacher;
- publish teacher-generated questions → Teacher;
- PLO/mapping change → Coordinator;
- CQI assignment → Coordinator;
- ILO mutation → Admin;
- institution policy/role change → Admin.

If existing product governance requires a stricter approver, use the stricter policy.

---

# 16. Approval Must Actually Execute After Approval

Approval is not cosmetic.

Create or reuse durable structures equivalent to:

```text
agent_action_proposals
agent_action_approvals
agent_action_executions
```

Proposal fields should include:

- action type;
- description;
- reason;
- evidence;
- affected entities;
- outcome level;
- risk level;
- reversibility;
- required approver;
- expiry;
- proposed payload;
- policy version;
- calculation version where relevant.

Statuses:

```text
draft
pending_approval
approved
rejected
expired
executing
completed
failed
cancelled
```

Execution flow:

```text
Agent proposes protected action
        ↓
Proposal stored as pending_approval
        ↓
Correct human sees Approval Card / Task Inbox
        ↓
Approve / Edit / Reject
        ↓
On approval, revalidate authorization and affected entity state
        ↓
Execute the narrowly scoped tool/RPC
        ↓
Store execution result
        ↓
Update UI/cache/notification state
        ↓
Measure later outcome when applicable
```

Never execute solely because a row says `approved`; always revalidate actor, institution, role, scope, policy, expiry and target state at execution time.

---

# 17. Student Learning State / Digital Twin

Implement an internal Student Learning Digital Twin but use a less invasive product name such as:

- **Student Learning State**
- **Learning Intelligence**
- **My Learning Profile**
- **Personal Learning Map**

It should be a unified, evidence-backed state rather than a free-form LLM memory.

## Mastery

- CLO attainment;
- PLO contribution;
- derived ILO alignment;
- competency gaps;
- prerequisite gaps;
- trend;
- evidence confidence/sufficiency.

## Habits

- study consistency;
- streaks;
- session completion;
- effective session duration;
- preferred study time;
- late-submission pattern.

## Risk / opportunity

- deterministic score/status where justified;
- contributing signals;
- calculation version;
- escalation recommendation.

## Support

- effective interventions;
- ineffective interventions;
- tutor autonomy;
- handoff state;
- consent state.

## Outcomes

- intervention accepted;
- intervention completed;
- mastery change;
- habit change;
- student feedback;
- teacher feedback.

Potential tables only after auditing existing equivalents:

```text
student_learning_states
student_mastery_snapshots
student_habit_snapshots
student_risk_snapshots
student_support_states
learning_interventions
intervention_outcomes
learning_state_events
```

Include institution and version fields.

Do not store medical or psychological diagnoses.

Use observable educational evidence.

### ILO language rule

Do not tell a student they have officially mastered an ILO unless the approved methodology actually supports that claim.

Use:

```text
CLO evidence
→ PLO contribution
→ derived ILO contribution/alignment
```

Use language such as:

- "Your current course evidence contributes to this institutional outcome."
- "This is a derived alignment based on mapped course evidence."

Never let the LLM invent official attainment.

---

# 18. DeepSeek Provider

Replace Gemini as the normal production generation dependency.

Create/reuse a provider abstraction with at minimum:

```text
DeepSeekProvider
MockProvider
```

Before finalizing model names, verify currently available DeepSeek models using official provider documentation or the provider `/models` endpoint from the implementation environment.

Suggested environment contract:

```env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_PRIMARY_MODEL=
DEEPSEEK_COMPLEX_MODEL=

AI_MAX_TOOL_STEPS=4
AI_MAX_TOOL_CALLS=6
AI_MAX_AGENT_TRANSFERS=2
AI_REQUEST_TIMEOUT_MS=
AI_DAILY_BUDGET_USD=

AI_FEATURE_ENABLED=false
AI_PROACTIVE_AGENTS_ENABLED=false
AI_AUTO_LOW_RISK_ENABLED=false
```

Never expose the key to browser code.

Use Supabase secrets / server-side configuration according to repository conventions.

Never print secrets.

---

# 19. RAG Strategy

RAG is a knowledge-retrieval component, not the whole agentic architecture.

Use structured Supabase tools/RPCs for authoritative structured facts such as:

- grades;
- attendance;
- assignments;
- deadlines;
- outcome mappings;
- attainment;
- habits;
- intervention state.

Use RAG for approved unstructured learning/institution knowledge such as:

- course PDFs;
- lecture notes;
- course documents;
- approved learning resources.

Keep:

```text
Supabase PostgreSQL
+ pgvector
+ course_material_embeddings
+ institution filtering
+ course filtering
+ CLO filtering
```

Do not add Pinecone now.

Improve retrieval with:

- hybrid semantic + keyword retrieval;
- source approval;
- citations;
- reranking where justified;
- Arabic and English evaluation;
- retrieval tests;
- prompt-injection resistance.

Do not change the embedding model during the same migration as the DeepSeek provider unless separately evaluated and justified.

Preserve existing tutor functionality while migrating incrementally:

- streaming;
- conversations;
- enrollment checks;
- RAG;
- citations;
- CLO context;
- tutor autonomy;
- academic integrity;
- usage limits;
- analytics;
- independence nudges;
- teacher handoffs;
- plan suggestions;
- XP behavior where already supported.

---

# 20. Shared Role-Aware Frontend

Build/reuse one shared AI UI system instead of five unrelated chat apps.

Suggested shared components:

```text
src/ai/components/
├── EdeviserAssistantPanel.tsx
├── AgentConversation.tsx
├── AgentComposer.tsx
├── AgentSuggestionCard.tsx
├── AgentApprovalCard.tsx
├── AgentEvidenceDrawer.tsx
├── AgentTaskInbox.tsx
├── AgentSourceCitation.tsx
├── AgentAutonomyControl.tsx
├── AgentFeedbackControls.tsx
├── LearningStateSummary.tsx
└── OutcomeAlignmentSummary.tsx
```

Adapt to:

- role;
- route;
- page entity;
- permission;
- available tools;
- suggested prompts;
- evidence sources;
- approval requirement.

Do not place a large generic chatbot on every page.

Use the correct combination of:

- Ask E Deviser;
- contextual insight card;
- proactive suggestion;
- evidence drawer;
- approval card;
- task inbox;
- dedicated assistant view when justified.

Preserve the existing E Deviser design system, responsive behavior, English/Arabic and RTL support.

---

# 21. All-Page Agentic Coverage

Create a complete `page-capability-matrix.md` for every authenticated route.

For every page record:

- page ID;
- role;
- page type;
- route;
- entity type/ID;
- course ID;
- student ID;
- program ID;
- outcome ID;
- read tools;
- draft tools;
- protected/write tools;
- suggested prompts;
- proactive cards;
- evidence sources;
- required approval;
- privacy/data classification;
- autonomy ceiling.

The goal is **agentic coverage across the application**, not AI on every pixel.

Normal static/dashboard UI may remain non-agentic; the intelligence layer should be available where it adds value.

---

# 22. Role Experience Requirements

## Student

Must support:

- Tutor;
- mastery summary;
- Learning State;
- CLO gaps;
- PLO/derived ILO explanation;
- prioritized study recommendations;
- diagnostic questions;
- goals and draft plans;
- handoff consent;
- proactive next-action cards.

## Teacher

Must support:

- Today's Attention;
- evidence-backed student flags;
- course outcomes;
- CLO/PLO/ILO chain;
- misconceptions;
- draft feedback;
- intervention drafts;
- tutor handoffs;
- question generation;
- outcome-level class patterns;
- intervention outcome tracking.

## Parent

Must support:

- verified linked child;
- positive-first authorized summary;
- meaningful weekly change;
- deadlines;
- authorized attendance context;
- practical support suggestion;
- privacy/consent explanation;
- no unnecessary internal analytics/private transcript exposure.

## Coordinator

Must support:

- PLO management;
- read-only institution ILO context;
- PLO-to-ILO mapping;
- outcome gaps;
- curriculum matrix/coverage;
- evidence sufficiency;
- program trends;
- CQI drafts and approval;
- accreditation evidence readiness.

## Admin

Must support:

- ILO management;
- outcome hierarchy health;
- mapping quality;
- institution attainment;
- program/department contribution;
- AI governance;
- AI cost;
- safety;
- reports/evidence packs;
- pending approvals;
- setup/data-completeness warnings.

---

# 23. Background Jobs / Durable Work

Audit existing cron/scheduling before adding new schedules. Do not duplicate jobs.

Use durable queues/jobs where appropriate for:

```text
student-risk-jobs
learning-state-update-jobs
intervention-generation-jobs
intervention-evaluation-jobs
teacher-summary-jobs
parent-summary-jobs
coordinator-analysis-jobs
institution-outcome-health-jobs
attainment-recalculation-jobs
agent-evaluation-jobs
```

Every background job needs:

- small batches;
- institution scope;
- idempotency;
- retry limits;
- dead-letter/failure handling;
- audit logging;
- deduplication;
- cooldown/rate limiting where user-facing;
- feature-flag gating.

Prefer event-driven updates where the repository already supports them, with scheduled reconciliation as a fallback.

---

# 24. Observability and Cost Governance

Store/reuse equivalents of:

```text
agent_conversations
agent_messages
agent_runs
agent_tool_calls
agent_tasks
agent_action_proposals
agent_action_approvals
agent_action_executions
agent_feedback
agent_evaluations
```

Log only what is needed:

- institution;
- actor;
- role;
- subject student/entity;
- outcome IDs;
- selected agent;
- provider/model;
- tool;
- authorization result;
- approval result;
- input/output token counts;
- estimated/actual cost where available;
- latency;
- citation/retrieval metadata;
- safety result;
- final status;
- policy/calculation version.

Do not log:

- secrets;
- API keys;
- auth tokens;
- raw credentials;
- unnecessary PII;
- hidden chain-of-thought.

## Cost-control principles

- use deterministic code/SQL instead of an LLM for calculations and triggers;
- do not send the entire Student Learning State when only a narrow subset is needed;
- cap tool steps/calls/transfers;
- use model routing for simple vs complex tasks;
- cache safe repeated retrieval where appropriate;
- enforce daily institution/platform budgets;
- expose cost and usage to Admin governance;
- fail safely when budgets are reached.

---

# 25. Investor/Demo Narrative Must Match the Real Product

The implementation should make this connected story genuinely possible, not merely visually simulated:

```text
1. Student Direction
   Student sees the next meaningful action.

2. Outcome Evidence
   Course activity is connected to CLO → PLO → derived ILO contribution.

3. Safe AI Support
   Tutor uses page/course/outcome context, approved knowledge, evidence, autonomy and policy.

4. Teacher Intervention
   The same signal reaches the assigned teacher with evidence and a proposed action.

5. Parent Reinforcement
   Parent receives a simplified, authorized summary and one practical support action.

6. Coordinator Improvement
   Repeated patterns become measurable curriculum gaps and CQI drafts.

7. Institutional Accountability
   Admin sees ILO health, evidence coverage, program contribution, governance, safety, cost and readiness.

8. Closed Loop
   Approved actions and measured outcomes return to update the student's Learning State and next recommendation.
```

Safe product language:

- "E Deviser combines authorized evidence and policy to recommend or draft a next action."
- "The student is flagged because of these specific learning and activity signals."
- "Course evidence contributes to this institutional outcome through mapped CLO and PLO relationships."
- "The teacher sees the right evidence and can act earlier."
- "A privacy-aware, authorized summary of meaningful change."
- "Daily academic evidence is organized into readiness and reportable evidence packs."
- "Specialist agents use a controlled tool registry, and protected actions require approval."

Do not claim:

- the AI always knows the correct action;
- unsupported failure probabilities;
- official ILO mastery from one student activity;
- guaranteed accreditation;
- agents can freely change grades/outcomes/records;
- unsupported productivity/time-saved numbers.

---

# 26. Staging / Noor International Connected Validation Scenario

Use real/live-safe staging seed data only where needed to prove wiring. Never convert seed/demo values into production fallbacks.

For the Noor International staging/demo story, keep one internally consistent chain across roles. Where the current seeded identities already exist, reuse their actual IDs rather than inventing parallel duplicates.

Canonical demo story may use:

```text
Institution: Noor International School
Student: Sara Ahmed
Teacher: Ms. Lina Hassan — Science 8
Parent: Omar Ahmed — verified parent of Sara
Coordinator: Dr. Maya Rahman — Science Program Coordinator
Admin: Noor Institution Admin
Course: Science 8 — Ecosystems and Sustainability
Assignment: Design a Local Water Conservation Plan
CLO: CLO 2 — Analyze human impact on local ecosystems
PLO: PLO 3 — Apply scientific reasoning to real-world problems
ILO: ILO 2 — Responsible problem-solving and civic contribution
Core signal: concept understanding is strong, but application of credible local evidence is developing.
```

Use this only if compatible with current staging data. If the live staging schema/data uses a different canonical student/profile already agreed in the repo, preserve one source of truth and document the mapping.

Seed/validate enough realistic data to exercise:

- upcoming deadline;
- rubric/evidence weakness;
- CLO/PLO/ILO chain;
- study/habit context;
- proactive teacher flag;
- tutor handoff;
- intervention proposal;
- approval;
- execution;
- student response/completion;
- measured follow-up;
- parent authorized summary/support action;
- repeated pattern across multiple courses for coordinator;
- CQI draft/approval path;
- Admin ILO health/evidence coverage/governance/cost/pending approvals.

No component should silently fall back to fake zero/default data on an RPC failure. Render proper loading/error/empty states.

---

# 27. Required Proactive Vertical Slice

Before broadening to every page, prove this real vertical slice end to end:

```text
New student evidence
      ↓
Recalculate relevant CLO attainment
      ↓
Update Student Learning State
      ↓
Deterministic risk/opportunity trigger fires
      ↓
Teacher Today's Attention flag is created automatically
      ↓
Flag shows affected CLO + contributing evidence/habit signals
      ↓
Intervention Agent creates a draft intervention
      ↓
Teacher sees Approve / Edit / Reject
      ↓
Teacher approves
      ↓
Authorization is revalidated
      ↓
Controlled tool executes intervention
      ↓
Student sees next action / intervention
      ↓
Student response/completion is recorded
      ↓
Follow-up evidence is measured
      ↓
Intervention outcome is stored
      ↓
Student Learning State updates
      ↓
Teacher flag resolves/changes
      ↓
Repeated patterns aggregate to Coordinator/Admin views where appropriate
```

This vertical slice must work without the student first asking the chatbot.

---

# 28. Testing Requirements

Inspect `package.json` and repo docs for the exact commands. Do not guess command names.

Run all relevant:

- TypeScript checks;
- lint;
- unit tests;
- integration tests;
- RLS tests;
- Edge Function tests;
- Playwright E2E;
- visual regression;
- accessibility tests;
- Arabic/RTL tests;
- migration replay/checks;
- Supabase Security Advisor;
- Supabase Performance Advisor.

## Required security/OBE tests

At minimum prove:

- Admin can list/create/edit/reorder valid ILOs in own institution;
- Admin cannot edit a PLO/CLO through ILO routes;
- mapped ILO deletion is blocked;
- Coordinator cannot create/edit ILO;
- Coordinator can manage PLO only in assigned program;
- Teacher cannot create ILO/PLO;
- Teacher can manage CLO only for assigned course;
- Student/Parent cannot mutate outcomes;
- cross-institution access/mutations fail;
- invalid hierarchy mapping fails;
- duplicate/mirrored mappings are prevented;
- cycles are prevented;
- mapping weight rules hold;
- CLO → PLO → ILO attainment cascade is correct;
- no role receives unauthorized agent tools;
- protected actions cannot execute without valid approval;
- stale/expired/foreign approvals cannot execute;
- approved actions execute only after revalidation;
- proactive jobs are idempotent and deduplicated;
- no duplicate notifications/tasks for unchanged signals;
- Student Agent uses derived ILO alignment language;
- Parent cannot see private data outside policy;
- RAG respects institution/course/CLO authorization;
- DeepSeek key is never browser exposed;
- feature flags can disable AI/proactive/A3 safely.

---

# 29. Rollout Phases

Follow this sequence unless the live audit proves a safer equivalent dependency order.

## Phase 0 — Audit/spec only

- repository audit;
- live schema audit;
- ILO audit;
- mapping-direction audit;
- RLS audit;
- AI/tutor/RAG audit;
- scheduling/notification audit;
- Kiro specs.

## Phase 1 — OBE correctness/security foundation

- reconcile mapping direction;
- repair historical outcome data;
- enforce constraints;
- harden outcome RLS;
- repair Admin ILO hooks/UI where needed;
- verify Coordinator/Teacher mapping flows;
- verify attainment cascade.

Do not expose outcome write tools to agents until Phase 1 passes.

## Phase 2 — Core AI infrastructure

- DeepSeek provider abstraction;
- incremental tutor migration;
- authenticated orchestrator;
- background worker skeleton;
- read-only tool registry;
- observability/cost tracking.

## Phase 3 — Shared UI + approvals

- shared assistant frontend;
- Student/Teacher/Admin page context;
- evidence drawer/citations;
- low-risk suggestions/drafts;
- approval proposal/inbox/execution system.

## Phase 4 — Learning State + proactive student intelligence

- Student Learning State;
- Mastery Agent;
- Habit Agent;
- Risk Agent;
- Intervention Agent;
- proactive worker triggers;
- first closed-loop intervention.

## Phase 5 — Teacher + Coordinator intelligence

- Teacher Copilot / Today's Attention;
- Coordinator Copilot;
- ILO/PLO/CLO context;
- repeated-pattern analysis;
- CQI drafts/approval flow.

## Phase 6 — Parent + institution intelligence

- Parent Agent;
- Full Admin Agent;
- institution intelligence;
- evidence/readiness views;
- governance, safety, cost and pending approvals.

## Phase 7 — Controlled A3

Only after evaluation thresholds pass:

- carefully controlled low-risk A3 execution;
- institution feature flags;
- evaluation thresholds;
- kill switches;
- rollback controls.

---

# 30. Required Deliverables

Do not declare the project done without producing/updating:

1. Full Kiro specification set.
2. Current-state audit.
3. ILO frontend/backend audit.
4. Outcome-mapping direction audit.
5. Outcome-data reconciliation report.
6. Security-remediation report.
7. Canonical hierarchy documentation.
8. Safe/reversible database changes using the repo-approved migration workflow.
9. Hardened RLS policies.
10. Repaired Admin ILO workflow.
11. Verified Coordinator PLO/ILO workflow.
12. Verified Teacher CLO/PLO workflow.
13. Verified attainment cascade.
14. DeepSeek provider.
15. Agent orchestrator.
16. Agent worker.
17. Specialist agents.
18. Role-aware tool registry.
19. Autonomy policy.
20. Approval proposal + approval + execution system.
21. Student Learning State/Digital Twin.
22. Proactive flag/task routing.
23. Shared role-aware AI frontend.
24. Page-capability matrix for all authenticated routes.
25. English and Arabic localization.
26. Unit/integration/RLS/Edge/E2E/visual/accessibility tests.
27. Security review.
28. Performance/cost review.
29. Deployment guide.
30. DeepSeek secret setup guide.
31. Feature-flag/kill-switch guide.
32. Rollback guide.
33. Traceability report.
34. Known-limitations report.
35. Final implementation/QA report including what was actually verified against live Supabase.

---

# 31. Definition of Done

Do not declare completion until all applicable items are true:

## OBE / database

- Admin ILO list uses live data.
- Admin can create/edit/reorder valid ILOs.
- ILO routes cannot mutate PLO/CLO IDs.
- Mapped ILO deletion is correctly blocked.
- Mapping direction is canonical across code + data.
- Historical mirrored/invalid mappings are reconciled safely.
- Outcome hierarchy constraints are enforced.
- Coordinator cannot mutate ILOs.
- Teacher cannot mutate ILO/PLO.
- Cross-institution mutations fail.
- Attainment rolls correctly CLO → PLO → ILO.

## AI architecture

- DeepSeek is the normal production LLM provider.
- Gemini is not required for normal production AI.
- One authenticated orchestrator controls specialist agents/tools.
- One background worker supports proactive intelligence.
- No model has arbitrary SQL/table/service-role access.
- Tool authorization is enforced outside the LLM.
- All five roles receive appropriate role-aware AI capability.

## Proactive/closed loop

- A student can be flagged to an assigned teacher automatically from real deterministic evidence.
- The flag contains real contributing signals, not a black-box label.
- The system can create a protected-action proposal automatically.
- The correct human can Approve/Edit/Reject it.
- Approved actions actually execute through a controlled tool after revalidation.
- Completed interventions record measurable outcomes.
- Student Learning State changes based on measured evidence/outcomes.
- Future recommendations use the updated state.
- Repeated patterns can reach Coordinator/Admin in aggregated form.

## Safety/privacy

- Protected actions require approval.
- A3 cannot bypass protected actions.
- Parent visibility is limited to authorized linked-child data.
- ILO student language is derived/alignment language unless official methodology supports mastery.
- No secrets or unnecessary PII are logged.
- No cross-institution leakage is possible through AI tools/RAG/jobs.

## Product/UI

- Shared agentic UI is role/page aware rather than five separate chatbots.
- Ask E Deviser, proactive insights, evidence drawer, approval card and task inbox are consistent.
- Existing application workflows remain functional.
- No mock production fallbacks.
- Error/loading/empty states are real and usable.
- English and Arabic/RTL work.
- Existing design-system/prototype parity is preserved or improved.

## QA/operations

- Relevant tests pass.
- Security Advisor findings introduced by this work are resolved.
- Performance regressions introduced by this work are resolved.
- Migration replay succeeds.
- Feature flags can disable AI, proactive agents and A3 independently.
- Rollback path exists.
- Kiro requirements/design/tasks/traceability are synchronized.

---

# 32. Implementation Conduct

Always:

- inspect before modifying;
- verify live schema before database work;
- repair/reuse before duplicating;
- preserve working functionality;
- keep changes small enough to verify;
- use vertical slices;
- test before marking complete;
- keep institution isolation explicit;
- use typed contracts and Zod validation;
- keep deterministic calculations outside the LLM;
- keep policy authorization outside the LLM;
- log decisions/results without hidden chain-of-thought;
- maintain auditability and rollback.

Never:

- bypass RLS;
- put service-role keys in browser code;
- use user-editable metadata as authoritative authorization;
- give the LLM arbitrary SQL;
- let the LLM authorize its own actions;
- mix outcome mapping directions;
- silently delete historical data;
- automatically change official outcomes/grades/records;
- create duplicate cron jobs;
- invent test success;
- replace working systems merely to match a proposed file name;
- expose private parent/student/teacher information outside policy;
- use fake production data to hide broken connectivity.

---

# 33. Final Execution Instruction

Start now in this order:

```text
1. Read AGENTS.md / README / package.json and current Kiro specs.
2. Audit current routes, AI/tutor/RAG, OBE and role workflows.
3. Audit live Supabase schema/RLS/functions/data/schedules.
4. Update the current-state and security/outcome audits.
5. Build a traceable task plan in Kiro.
6. Fix OBE mapping/RLS/attainment foundation first.
7. Implement DeepSeek provider + orchestrator + safe read tools.
8. Implement approval proposal/execution infrastructure.
9. Implement Student Learning State + proactive worker.
10. Prove the mandatory Teacher Today's Attention closed-loop vertical slice.
11. Expand to Student, Parent, Coordinator and Admin role experiences.
12. Add all-page capability matrix and proactive cards/task inbox.
13. Complete localization, observability, cost controls and feature flags.
14. Run full QA/security/performance/migration verification.
15. Fix failures and repeat until Definition of Done passes.
16. Produce final implementation, deployment, rollback and known-limitations reports.
```

Do not stop at a design document if implementation can proceed safely.

Do not call the product complete because an agent can chat.

The proof of completion is a **real, governed, proactive closed loop**:

```text
DETECT
  ↓
EXPLAIN WITH EVIDENCE
  ↓
ROUTE TO THE RIGHT ROLE
  ↓
RECOMMEND / DRAFT
  ↓
REQUEST APPROVAL WHEN PROTECTED
  ↓
EXECUTE AFTER VALID APPROVAL
  ↓
MEASURE RESULT
  ↓
UPDATE LEARNING STATE
  ↓
IMPROVE THE NEXT STUDENT / TEACHER / PROGRAM / INSTITUTION DECISION
```

That is the target E Deviser agentic architecture.
