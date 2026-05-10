// scripts/audit/nova-act/flow-discovery/prompts.ts
//
// Task 21.8 / Req 18.4: Per-role flow-discovery directives for Nova Act.
//
// These prompts are used for the exploratory (non-scripted) flow-discovery
// pass. The agent is instructed to explore the role's available actions and
// report any confusing, broken, or redundant UI.

export type Role = "admin" | "coordinator" | "teacher" | "student" | "parent";

export interface FlowDiscoveryPrompt {
  readonly role: Role;
  readonly startingPath: string;
  readonly prompt: string;
  readonly stepBudget: number;
}

export const FLOW_DISCOVERY_PROMPTS: Record<Role, FlowDiscoveryPrompt> = {
  admin: {
    role: "admin",
    startingPath: "/admin/dashboard",
    stepBudget: 50,
    prompt: `
You are an admin user of an educational platform called Edeviser.
Your institution manages multiple programs, courses, and students.

Explore the admin dashboard and all available navigation items.
Pay special attention to:
- Institution Learning Outcomes (ILOs) management
- User management (creating, editing, deactivating users)
- Audit log viewer (reviewing who did what)
- Institution settings and configuration
- Bonus XP event creation

Report any of the following issues you encounter:
1. Confusing or ambiguous UI labels
2. Actions that require more than 3 clicks to complete
3. Missing feedback (loading states, error messages, success confirmations)
4. Broken or non-functional buttons/links
5. Redundant or duplicate navigation items
6. Data that appears stale or inconsistent
7. Any accessibility barriers (missing labels, poor contrast, keyboard traps)
`.trim(),
  },

  coordinator: {
    role: "coordinator",
    startingPath: "/coordinator/dashboard",
    stepBudget: 50,
    prompt: `
You are a program coordinator at an educational institution using Edeviser.
You are responsible for managing Program Learning Outcomes (PLOs) and ensuring
curriculum alignment.

Explore the coordinator dashboard and all available features.
Pay special attention to:
- PLO creation and management
- PLO-to-ILO mapping (outcome alignment)
- Curriculum matrix (PLO × Course coverage grid)
- CQI (Continuous Quality Improvement) action plans
- Program accreditation reports

Report any of the following issues:
1. Confusing terminology or labels (especially OBE-specific terms)
2. The curriculum matrix — are coverage gaps clearly indicated?
3. PLO mapping workflow — is the weight assignment intuitive?
4. CQI action plan workflow — is the status progression clear?
5. Any missing data or broken visualizations
6. Actions that feel unnecessarily complex
`.trim(),
  },

  teacher: {
    role: "teacher",
    startingPath: "/teacher/dashboard",
    stepBudget: 50,
    prompt: `
You are a teacher at a university using Edeviser for outcome-based education.
You manage courses, create learning outcomes, design assignments, and grade students.

Explore the teacher dashboard and all available features.
Pay special attention to:
- Course management and CLO (Course Learning Outcome) creation
- Bloom's taxonomy level selection for CLOs
- Assignment creation and linking to CLOs
- Grading queue and rubric-based grading
- Grade release workflow
- Student progress monitoring

Report any of the following issues:
1. Is the Bloom's taxonomy level selection intuitive?
2. Is the CLO-to-assignment linking workflow clear?
3. Is the grading rubric interface easy to use?
4. Are there any confusing steps in the grade release process?
5. Is student progress data easy to interpret?
6. Any missing features that teachers would commonly need
`.trim(),
  },

  student: {
    role: "student",
    startingPath: "/student/dashboard",
    stepBudget: 50,
    prompt: `
You are a university student using Edeviser to track your learning progress.
You submit assignments, earn XP, maintain streaks, and compete on leaderboards.

Explore the student dashboard and all available features.
Pay special attention to:
- Learning path (assignments ordered by Bloom's level)
- Assignment submission workflow
- XP and level display
- Streak tracking
- Leaderboard and opt-out privacy
- Badge collection
- Journal entries

Report any of the following issues:
1. Is the learning path ordering intuitive?
2. Are prerequisite gates clearly communicated?
3. Is the XP/gamification system motivating and clear?
4. Is the streak system easy to understand?
5. Is the leaderboard opt-out easy to find and use?
6. Any gamification elements that feel confusing or demotivating
7. Mobile usability issues (if testing on mobile viewport)
`.trim(),
  },

  parent: {
    role: "parent",
    startingPath: "/parent/dashboard",
    stepBudget: 40,
    prompt: `
You are a parent of a university student using Edeviser to monitor your child's progress.
You have a verified link to your child's account.

Explore the parent dashboard and all available features.
Pay special attention to:
- Child progress overview
- Course grades and attainment levels
- XP and gamification summary
- Notification feed
- Attainment trend charts

Report any of the following issues:
1. Is the child progress data easy to understand for a non-academic parent?
2. Are attainment levels (Excellent, Satisfactory, Developing, Not Yet) clearly explained?
3. Is the notification feed useful and not overwhelming?
4. Is there any data that parents would expect to see but is missing?
5. Any confusing educational jargon that should be explained
6. Mobile usability issues (parents often use mobile devices)
`.trim(),
  },
};
