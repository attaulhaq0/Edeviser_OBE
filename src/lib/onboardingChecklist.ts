// =============================================================================
// onboardingChecklist — Role-specific Quick Start checklist items
// =============================================================================

import type { UserRole } from "@/types/app";

export interface ChecklistItemDef {
  id: string;
  label: string;
  route: string;
}

const ADMIN_CHECKLIST: ChecklistItemDef[] = [
  {
    id: "create-ilo",
    label: "Create your first ILO",
    route: "/admin/outcomes",
  },
  { id: "create-program", label: "Create a program", route: "/admin/programs" },
  {
    id: "invite-coordinator",
    label: "Invite a coordinator",
    route: "/admin/users",
  },
  { id: "invite-teacher", label: "Invite a teacher", route: "/admin/users" },
];

const COORDINATOR_CHECKLIST: ChecklistItemDef[] = [
  {
    id: "create-plo",
    label: "Create your first PLO",
    route: "/coordinator/plos",
  },
  {
    id: "map-plo-ilo",
    label: "Map a PLO to an ILO",
    route: "/coordinator/plos",
  },
  {
    id: "view-matrix",
    label: "View the curriculum matrix",
    route: "/coordinator/matrix",
  },
];

const TEACHER_CHECKLIST: ChecklistItemDef[] = [
  { id: "create-clo", label: "Create your first CLO", route: "/teacher/clos" },
  { id: "build-rubric", label: "Build a rubric", route: "/teacher/rubrics" },
  {
    id: "create-assignment",
    label: "Create an assignment",
    route: "/teacher/assignments",
  },
  {
    id: "grade-submission",
    label: "Grade a submission",
    route: "/teacher/grading",
  },
];

const STUDENT_CHECKLIST: ChecklistItemDef[] = [
  {
    id: "view-progress",
    label: "Check your learning progress",
    route: "/student/progress",
  },
  {
    id: "write-journal",
    label: "Write a journal entry",
    route: "/student/journal",
  },
  {
    id: "view-leaderboard",
    label: "View the leaderboard",
    route: "/student/leaderboard",
  },
  {
    id: "view-habits",
    label: "Explore your habit tracker",
    route: "/student/habits",
  },
];

const CHECKLIST_MAP: Partial<Record<UserRole, ChecklistItemDef[]>> = {
  admin: ADMIN_CHECKLIST,
  coordinator: COORDINATOR_CHECKLIST,
  teacher: TEACHER_CHECKLIST,
  student: STUDENT_CHECKLIST,
};

export const getChecklistForRole = (role: UserRole): ChecklistItemDef[] => {
  return CHECKLIST_MAP[role] ?? [];
};
