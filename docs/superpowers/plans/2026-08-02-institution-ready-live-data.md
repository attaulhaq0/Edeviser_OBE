# Institution-ready Live Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Noor International a small, workflow-realistic showcase while keeping Gulf Academy and every other institution limited to records created through normal application use.

**Architecture:** Replace role/profile fallbacks with typed institution-scoped hooks. Add a guarded Noor-only provisioner that inserts only small missing production-shaped records idempotently. Reuse one attendance trend model in teacher and parent surfaces, then align non-student visual primitives.

**Tech Stack:** React 18, TypeScript strict mode, TanStack Query v5, Supabase Postgres/RLS/Edge Functions, Shadcn/ui, Tailwind CSS v4, Vitest, fast-check.

---

## File map

- `src/pages/parent/settings/ParentProfilePage.tsx`: live parent identity, contact, learner, institution, and KPI states.
- `src/hooks/useParentDashboardAggregate.ts`, `src/hooks/useParentDashboard.ts`: parent/institution aggregate contracts.
- `src/pages/parent/ParentProgressPage.tsx`, `src/hooks/useParentProgress.ts`: live study-consistency state.
- `src/features/parent/fees/ParentFeesPage.tsx`, `src/features/shared/fees/FeePaymentList.tsx`, `src/hooks/useFees.ts`: charges and payment history states.
- `src/pages/parent/communications/ParentCommunicationsPage.tsx`, `src/hooks/useAnnouncements.ts`, `src/hooks/useNotifications.ts`: institution-scoped communications.
- `src/lib/attendanceTrends.ts`, `src/hooks/useAttendance.ts`, `src/pages/teacher/attendance/AttendanceReport.tsx`: normalized attendance trends and redesigned teacher workspace.
- `supabase/functions/provision-noor-demo/index.ts`, `src/lib/noorDemoProvisioning.ts`: Noor-only authenticated provisioner.
- `src/components/shared/ParentSectionIcon.tsx`, `src/components/shared/AdminSectionHeader.tsx`, `src/components/ui/EdvToggle.tsx`, and teacher/coordinator/admin dashboard screens: shared UI system.

### Task 1: Remove fabricated parent profile values

**Files:**

- Create: `src/lib/institutionDataAudit.ts`
- Create: `src/__tests__/unit/institutionDataAudit.test.ts`
- Modify: `src/pages/parent/settings/ParentProfilePage.tsx`

- [ ] **Step 1: Write the failing detector test**

```ts
import { describe, expect, it } from "vitest";
import { findForbiddenInstitutionLiterals } from "@/lib/institutionDataAudit";

describe("findForbiddenInstitutionLiterals", () => {
  it("reports literal institution names", () => {
    expect(findForbiddenInstitutionLiterals("Grade 11 · Gulf Academy")).toEqual(
      ["Gulf Academy"]
    );
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/__tests__/unit/institutionDataAudit.test.ts`

Expected: FAIL because the utility does not exist.

- [ ] **Step 3: Implement the utility and remove all profile fallbacks**

```ts
const forbiddenInstitutionNames = [
  "Gulf Academy",
  "Noor International",
] as const;
export const findForbiddenInstitutionLiterals = (content: string): string[] =>
  forbiddenInstitutionNames.filter((name) => content.includes(name));
```

Replace fixed parent name, contact details, link date, fallback learner entries, literal institution name, and numerical KPI defaults with live values or explicit `null`-aware labels.

- [ ] **Step 4: Run and commit**

Run: `npx vitest run src/__tests__/unit/institutionDataAudit.test.ts`

Expected: PASS.

```bash
git add src/lib/institutionDataAudit.ts src/__tests__/unit/institutionDataAudit.test.ts src/pages/parent/settings/ParentProfilePage.tsx && git commit -m "fix(parent): remove fabricated profile data"
```

### Task 2: Resolve linked learners, financials, and communications by institution

**Files:**

- Modify: `src/hooks/useParentDashboardAggregate.ts`
- Modify: `src/hooks/useParentDashboard.ts`
- Modify: `src/pages/parent/settings/ParentProfilePage.tsx`
- Modify: `src/hooks/useFees.ts`
- Modify: `src/features/parent/fees/ParentFeesPage.tsx`
- Modify: `src/features/shared/fees/FeePaymentList.tsx`
- Modify: `src/pages/parent/communications/ParentCommunicationsPage.tsx`
- Test: `src/__tests__/unit/roleProfileScreens.test.tsx`
- Test: `src/__tests__/unit/parentFees.test.tsx`
- Test: `src/__tests__/unit/parentCommunications.test.tsx`

- [ ] **Step 1: Write failing live/empty-state tests**

```tsx
it("renders the learner institution supplied by the aggregate", () => {
  mockAggregate({
    children: [
      {
        student_id: "aarav",
        student_name: "Aarav Sharma",
        institution_name: "Noor International",
      },
    ],
  });
  render(<ParentProfilePage />);
  expect(
    screen.getByText(/Noor International · link verified/i)
  ).toBeInTheDocument();
});

it("does not render a synthetic charge when no fee record exists", () => {
  mockFees({ outstandingTotal: 0, payments: [] });
  render(<ParentFeesPage />);
  expect(screen.getByText(/No charges have been issued/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `npx vitest run src/__tests__/unit/roleProfileScreens.test.tsx src/__tests__/unit/parentFees.test.tsx src/__tests__/unit/parentCommunications.test.tsx`

Expected: FAIL for missing live/empty-state contracts.

- [ ] **Step 3: Extend aggregate types and hook queries**

```ts
export interface LinkedChildSummary {
  student_id: string;
  student_name: string;
  grade_label: string | null;
  institution_name: string | null;
  linked_at: string | null;
}
const isEmpty = !isLoading && charges.length === 0 && payments.length === 0;
```

Fetch the child's institution relation in the aggregate. Render `institution_name ?? "Institution not available"` and no fallback learner. Keep charges, payments, announcements, and notifications as database values; render actionable zero-data states instead of examples.

- [ ] **Step 4: Run and commit**

Run: `npx vitest run src/__tests__/unit/roleProfileScreens.test.tsx src/__tests__/unit/parentFees.test.tsx src/__tests__/unit/parentCommunications.test.tsx && npx tsc --noEmit`

Expected: PASS.

```bash
git add src/hooks/useParentDashboardAggregate.ts src/hooks/useParentDashboard.ts src/pages/parent/settings/ParentProfilePage.tsx src/hooks/useFees.ts src/features/parent/fees/ParentFeesPage.tsx src/features/shared/fees/FeePaymentList.tsx src/pages/parent/communications/ParentCommunicationsPage.tsx src/__tests__/unit && git commit -m "fix(parent): scope records to live institution data"
```

### Task 3: Create a reusable real-data attendance trend model

**Files:**

- Create: `src/lib/attendanceTrends.ts`
- Create: `src/__tests__/unit/attendanceTrends.test.ts`
- Modify: `src/hooks/useAttendance.ts`
- Modify: `src/hooks/useParentProgress.ts`
- Modify: `src/pages/teacher/attendance/AttendanceReport.tsx`
- Modify: `src/pages/parent/ParentProgressPage.tsx`

- [ ] **Step 1: Write failing trend tests**

```ts
it("returns weekly rates from persisted attendance records", () => {
  expect(
    buildWeeklyAttendanceTrend([
      { date: "2026-08-01", status: "present" },
      { date: "2026-08-02", status: "absent" },
    ])
  ).toEqual([{ week: "2026-07-27", rate: 50, present: 1, total: 2 }]);
});
it("returns no trend for no records", () =>
  expect(buildWeeklyAttendanceTrend([])).toEqual([]));
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/__tests__/unit/attendanceTrends.test.ts`

Expected: FAIL because the trend utility does not exist.

- [ ] **Step 3: Implement one normalized trend model and two presentations**

```ts
export const buildWeeklyAttendanceTrend = (records: AttendanceRecord[]) =>
  groupByWeek(records).map(({ week, records: weekRecords }) => ({
    week,
    present: weekRecords.filter((record) => record.status === "present").length,
    total: weekRecords.length,
    rate: percentageOfPresent(weekRecords),
  }));
```

Use this model for the blue teacher workspace—headline rate, weekly trend, course breakdown, and risk list—and parent study consistency. An empty model renders an icon, explanation, and real next action; never blank chart space or invented bars.

- [ ] **Step 4: Run and commit**

Run: `npx vitest run src/__tests__/unit/attendanceTrends.test.ts src/__tests__/unit/roleProfileScreens.test.tsx`

Expected: PASS.

```bash
git add src/lib/attendanceTrends.ts src/__tests__/unit/attendanceTrends.test.ts src/hooks/useAttendance.ts src/hooks/useParentProgress.ts src/pages/teacher/attendance/AttendanceReport.tsx src/pages/parent/ParentProgressPage.tsx && git commit -m "feat(attendance): present live attendance and consistency trends"
```

### Task 4: Provision small Noor-only workflow data safely

**Files:**

- Create: `supabase/functions/provision-noor-demo/index.ts`
- Create: `src/lib/noorDemoProvisioning.ts`
- Create: `src/__tests__/unit/noorDemoProvisioning.test.ts`
- Create: `src/__tests__/properties/institutionIsolation.property.test.ts`

- [ ] **Step 1: Write failing provisioning guard tests**

```ts
it("rejects provisioning outside Noor", () =>
  expect(
    validateNoorProvisioningTarget("other-id", NOOR_INTERNATIONAL_ID)
  ).toEqual({ ok: false, reason: "institution_not_allowed" }));
it("does not plan duplicate records", () =>
  expect(buildNoorProvisioningPlan(existingNoorState)).toEqual([]));
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/__tests__/unit/noorDemoProvisioning.test.ts`

Expected: FAIL because provisioning helpers do not exist.

- [ ] **Step 3: Implement the authenticated, Noor-admin-only provisioner**

```ts
if (
  callerProfile.role !== "admin" ||
  callerProfile.institution_id !== NOOR_INTERNATIONAL_ID
)
  return json({ error: "forbidden" }, 403);
```

Use existing Noor profiles, courses, enrollments, fee/payment, attendance, announcement, and notification tables. Insert only missing rows, key every insert to Noor, preserve existing user records, return created/skipped counts, never use a frontend service-role key, and never target Gulf Academy.

- [ ] **Step 4: Add isolation property, test, deploy, and commit**

```ts
// Feature: institution-ready live data, Property 1: Noor provisioning cannot target another institution.
fc.assert(
  fc.property(fc.uuid(), (institutionId) => {
    fc.pre(institutionId !== NOOR_INTERNATIONAL_ID);
    expect(
      validateNoorProvisioningTarget(institutionId, NOOR_INTERNATIONAL_ID).ok
    ).toBe(false);
  }),
  { numRuns: 100 }
);
```

Run: `npx vitest run src/__tests__/unit/noorDemoProvisioning.test.ts src/__tests__/properties/institutionIsolation.property.test.ts`

Expected: PASS. Deploy with JWT verification, invoke twice as Noor admin, and use read-only SQL to prove no duplicates and no Gulf Academy change.

```bash
git add supabase/functions/provision-noor-demo/index.ts src/lib/noorDemoProvisioning.ts src/__tests__/unit/noorDemoProvisioning.test.ts src/__tests__/properties/institutionIsolation.property.test.ts && git commit -m "feat(data): provision Noor workflow records safely"
```

### Task 5: Align non-student role UI and release-test it

**Files:**

- Modify: `src/components/shared/ParentSectionIcon.tsx`
- Modify: `src/components/shared/AdminSectionHeader.tsx`
- Modify: `src/components/ui/EdvToggle.tsx`
- Modify: `src/features/teacher/dashboard/TeacherDashboardScreen.tsx`
- Modify: `src/features/coordinator/dashboard/CoordinatorDashboardScreen.tsx`
- Modify: `src/features/admin/dashboard/AdminDashboardScreen.tsx`
- Test: `src/__tests__/unit/roleProfileScreens.test.tsx`

- [ ] **Step 1: Write a failing shared-surface test**

```tsx
it("uses the tactile blue class for non-student role toggles", () => {
  render(<EdvToggle checked={false} onCheckedChange={() => undefined} />);
  expect(screen.getByRole("switch")).toHaveClass("bg-blue-600");
});
```

- [ ] **Step 2: Run, implement shared visual tokens, and re-run**

Run: `npx vitest run src/__tests__/unit/roleProfileScreens.test.tsx`

Expected: FAIL before implementation, PASS afterwards.

```ts
export const ROLE_HERO_BLUE = "#0f4c81";
export const LIQUID_ICON_CONTAINER =
  "bg-white/80 border border-slate-200/60 backdrop-blur-xs";
```

Apply shared tokens to teacher, coordinator, and admin hero cards/icon wrappers and the tactile toggle. Student pages remain untouched.

- [ ] **Step 3: Run full release verification and commit**

Run: `npm run lint && npx tsc --noEmit && npm test`

Expected: all commands exit 0.

Browser QA: Noor parent profile, fees, communications, progress, teacher attendance, coordinator dashboard, and admin dashboard at desktop and mobile; Gulf Academy sees no Noor records and every zero-data state is actionable.

```bash
git add src/components/shared/ParentSectionIcon.tsx src/components/shared/AdminSectionHeader.tsx src/components/ui/EdvToggle.tsx src/features/teacher/dashboard/TeacherDashboardScreen.tsx src/features/coordinator/dashboard/CoordinatorDashboardScreen.tsx src/features/admin/dashboard/AdminDashboardScreen.tsx src/__tests__/unit/roleProfileScreens.test.tsx && git commit -m "feat(ui): align live role surfaces"
```

## Plan self-review

- Spec coverage: Tasks 1–2 cover parent hardcoding, financial, announcement, and notification data; Task 3 covers teacher attendance and parent study consistency; Task 4 covers Noor-only workflow records and isolation; Task 5 covers UI consistency and release verification.
- Completion scan: every task contains concrete paths, code, commands, and expected outcomes.
- Type consistency: Task 2 defines `LinkedChildSummary`; Task 3 consumes the normalized attendance record model; Task 4 uses one `NOOR_INTERNATIONAL_ID` guard in unit code and Edge Function authorization.
