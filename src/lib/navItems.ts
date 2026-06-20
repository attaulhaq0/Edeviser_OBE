/**
 * Unified nav item definitions for all role layouts.
 *
 * Single source of truth — consumed by role layouts and any component
 * that needs to enumerate navigation (e.g. GlobalHeader, breadcrumbs,
 * search indexing, guided tour step generation).
 *
 * labelKey uses the `common:nav.*` namespace so callers can do:
 *   const { t } = useTranslation('common');
 *   t(item.labelKey)   // e.g. t('nav.dashboard') → "Dashboard"
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Building2,
  BookOpen,
  GraduationCap,
  Calendar,
  Target,
  Clock,
  CalendarDays,
  DollarSign,
  FileText,
  ScrollText,
  Sparkles,
  Award,
  Store,
  ClipboardList,
  Grid3X3,
  GitBranch,
  Search,
  LayoutGrid,
  TrendingUp,
  ClipboardCheck,
  TableProperties,
  CheckSquare,
  FlaskConical,
  Megaphone,
  FolderOpen,
  Trophy,
  HeartPulse,
  BarChart3,
  Handshake,
  ClipboardList as ClipboardListIcon,
  CalendarCheck,
  Bot,
  PenLine,
  Star,
  FileQuestion,
  Swords,
  GraduationCap as GraduationCapIcon,
  Workflow,
  UserCog,
} from "lucide-react";
import type { UserRole } from "@/types/app";
import type { NavGroup } from "@/lib/navGroups";

export interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  /**
   * Task 22.1 (R20.1, R20.2): the labeled student-navigation section this item
   * belongs to. Optional because grouping applies to the student navigation
   * only — admin/coordinator/teacher/parent items leave this undefined. Student
   * items are validated against {@link REQUIRED_NAV_GROUPS} via `assertNavGroup`
   * (e.g. the AI Tutor item must belong to `learn`, R20.6).
   */
  group?: NavGroup;
  /**
   * Task 22.3 (R23.3): the item is kept (it still provides a student-relevant
   * function) but de-emphasized relative to core learning items. The sidebar
   * sinks de-emphasized items to the bottom of their section and renders them
   * with subdued styling. Used for "My Content", which students can use to
   * author study plans / quiz questions but which is secondary to the core
   * learning items (Courses, Assignments, AI Tutor).
   */
  deEmphasized?: boolean;
}

const adminNavItems: NavItem[] = [
  { to: "/admin/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/admin/users", labelKey: "nav.users", icon: Users },
  { to: "/admin/departments", labelKey: "nav.departments", icon: Building2 },
  { to: "/admin/programs", labelKey: "nav.programs", icon: BookOpen },
  { to: "/admin/courses", labelKey: "nav.courses", icon: GraduationCap },
  { to: "/admin/semesters", labelKey: "nav.semesters", icon: Calendar },
  { to: "/admin/outcomes", labelKey: "nav.ilos", icon: Target },
  { to: "/admin/timetable", labelKey: "nav.timetable", icon: Clock },
  { to: "/admin/calendar", labelKey: "nav.calendar", icon: CalendarDays },
  { to: "/admin/fees", labelKey: "nav.fees", icon: DollarSign },
  { to: "/admin/reports", labelKey: "nav.reports", icon: FileText },
  { to: "/admin/audit-log", labelKey: "nav.auditLog", icon: ScrollText },
  { to: "/admin/bonus-events", labelKey: "nav.bonusXp", icon: Sparkles },
  {
    to: "/admin/badges/spotlight",
    labelKey: "nav.badgeSpotlight",
    icon: Award,
  },
  { to: "/admin/marketplace", labelKey: "nav.marketplace", icon: Store },
  { to: "/admin/surveys", labelKey: "nav.surveys", icon: ClipboardList },
];

const coordinatorNavItems: NavItem[] = [
  {
    to: "/coordinator/dashboard",
    labelKey: "nav.dashboard",
    icon: LayoutDashboard,
  },
  { to: "/coordinator/plos", labelKey: "nav.plos", icon: Target },
  { to: "/coordinator/matrix", labelKey: "nav.matrix", icon: Grid3X3 },
  { to: "/coordinator/sankey", labelKey: "nav.sankeyDiagram", icon: GitBranch },
  {
    to: "/coordinator/gap-analysis",
    labelKey: "nav.gapAnalysis",
    icon: Search,
  },
  {
    to: "/coordinator/coverage-heatmap",
    labelKey: "nav.coverageHeatmap",
    icon: LayoutGrid,
  },
  { to: "/coordinator/cqi", labelKey: "nav.cqiPlans", icon: ClipboardCheck },
  {
    to: "/coordinator/outcome-chain",
    labelKey: "nav.outcomeChain",
    icon: Workflow,
  },
  {
    to: "/coordinator/course-file",
    labelKey: "nav.courseFile",
    icon: FileText,
  },
  { to: "/coordinator/timetable", labelKey: "nav.timetable", icon: Clock },
];

const teacherNavItems: NavItem[] = [
  {
    to: "/teacher/dashboard",
    labelKey: "nav.dashboard",
    icon: LayoutDashboard,
  },
  { to: "/teacher/clos", labelKey: "nav.clos", icon: Target },
  { to: "/teacher/rubrics", labelKey: "nav.rubrics", icon: TableProperties },
  {
    to: "/teacher/assignments",
    labelKey: "nav.assignments",
    icon: ClipboardListIcon,
  },
  { to: "/teacher/grading", labelKey: "nav.grading", icon: CheckSquare },
  { to: "/teacher/gradebook", labelKey: "nav.gradebook", icon: BookOpen },
  {
    to: "/teacher/announcements",
    labelKey: "nav.announcements",
    icon: Megaphone,
  },
  { to: "/teacher/modules", labelKey: "nav.modules", icon: FolderOpen },
  { to: "/teacher/calendar", labelKey: "nav.calendar", icon: Calendar },
  { to: "/teacher/timetable", labelKey: "nav.timetable", icon: Clock },
  { to: "/teacher/challenges", labelKey: "nav.challenges", icon: Trophy },
  { to: "/teacher/teams", labelKey: "nav.teams", icon: Users },
  { to: "/teacher/team-health", labelKey: "nav.teamHealth", icon: HeartPulse },
  {
    to: "/teacher/tutor-analytics",
    labelKey: "nav.tutorAnalytics",
    icon: BarChart3,
  },
  {
    to: "/teacher/tutor-handoffs",
    labelKey: "nav.tutorHandoffs",
    icon: Handshake,
  },
  {
    to: "/teacher/baseline",
    labelKey: "nav.baselineTests",
    icon: FlaskConical,
  },
];

const studentNavItems: NavItem[] = [
  {
    to: "/student/dashboard",
    labelKey: "nav.dashboard",
    icon: LayoutDashboard,
    group: "learn",
  },
  {
    to: "/student/courses",
    labelKey: "nav.courses",
    icon: BookOpen,
    group: "learn",
  },
  {
    to: "/student/assignments",
    labelKey: "nav.assignments",
    icon: ClipboardListIcon,
    group: "learn",
  },
  {
    to: "/student/planner",
    labelKey: "nav.planner",
    icon: CalendarDays,
    group: "tools",
  },
  {
    to: "/student/today",
    labelKey: "nav.today",
    icon: CalendarCheck,
    group: "tools",
  },
  {
    to: "/student/progress",
    labelKey: "nav.progress",
    icon: TrendingUp,
    group: "growth",
  },
  {
    to: "/student/leaderboard",
    labelKey: "nav.leaderboard",
    icon: Trophy,
    group: "community",
  },
  {
    to: "/student/challenges",
    labelKey: "nav.challenges",
    icon: Swords,
    group: "growth",
  },
  {
    to: "/student/team",
    labelKey: "nav.myTeam",
    icon: Users,
    group: "community",
  },
  {
    to: "/student/habits",
    labelKey: "nav.habits",
    icon: Grid3X3,
    group: "growth",
  },
  {
    to: "/student/marketplace",
    labelKey: "nav.marketplace",
    icon: Store,
    group: "growth",
  },
  {
    to: "/student/content",
    labelKey: "nav.myContent",
    icon: FileText,
    group: "learn",
    // R23.3: "My Content" lets students author study plans / quiz questions, so
    // it has student value and is kept — but it is secondary to the core
    // learning items, so it is de-emphasized (sunk + subdued) rather than
    // removed.
    deEmphasized: true,
  },
  {
    to: "/student/journal",
    labelKey: "nav.journal",
    icon: PenLine,
    group: "tools",
  },
  { to: "/student/tutor", labelKey: "nav.aiTutor", icon: Bot, group: "learn" },
  {
    to: "/student/calendar",
    labelKey: "nav.calendar",
    icon: Calendar,
    group: "tools",
  },
  {
    to: "/student/timetable",
    labelKey: "nav.timetable",
    icon: Clock,
    group: "tools",
  },
  {
    to: "/student/portfolio",
    labelKey: "nav.portfolio",
    icon: Star,
    group: "growth",
  },
  {
    to: "/student/surveys",
    labelKey: "nav.surveys",
    icon: FileQuestion,
    group: "tools",
  },
];

const parentNavItems: NavItem[] = [
  { to: "/parent/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/parent/children", labelKey: "nav.children", icon: GraduationCapIcon },
  { to: "/parent/progress", labelKey: "nav.progress", icon: TrendingUp },
  { to: "/parent/attendance", labelKey: "nav.attendance", icon: CalendarDays },
  { to: "/parent/planner", labelKey: "nav.studyPlan", icon: BookOpen },
  { to: "/parent/profile", labelKey: "nav.profile", icon: UserCog },
];

export const navItems: Record<UserRole, NavItem[]> = {
  admin: adminNavItems,
  coordinator: coordinatorNavItems,
  teacher: teacherNavItems,
  student: studentNavItems,
  parent: parentNavItems,
};
