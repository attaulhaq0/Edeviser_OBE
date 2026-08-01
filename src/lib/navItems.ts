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
  ShieldAlert,
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
  Megaphone,
  FolderOpen,
  Trophy,
  HeartPulse,
  Handshake,
  ClipboardList as ClipboardListIcon,
  CalendarCheck,
  Bot,
  PenLine,
  Star,
  FileQuestion,
  Swords,
  Workflow,
  UserCog,
  Wallet,
  Bell,
  MessageSquare,
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
  { to: "/admin/analytics", labelKey: "nav.analytics", icon: TrendingUp },
  {
    to: "/admin/accreditation-reports",
    labelKey: "nav.accreditationReports",
    icon: FileText,
  },
  { to: "/admin/settings/profile", labelKey: "nav.me", icon: UserCog },
  {
    to: "/admin/settings/institution",
    labelKey: "nav.institutionStructure",
    icon: Building2,
  },
  { to: "/admin/users", labelKey: "nav.users", icon: Users },
  { to: "/admin/departments", labelKey: "nav.departments", icon: Building2 },
  { to: "/admin/programs", labelKey: "nav.programs", icon: BookOpen },
  { to: "/admin/courses", labelKey: "nav.courses", icon: GraduationCap },
  { to: "/admin/semesters", labelKey: "nav.semesters", icon: Calendar },
  { to: "/admin/outcomes", labelKey: "nav.ilos", icon: Target },
  { to: "/admin/timetable", labelKey: "nav.timetable", icon: Clock },
  { to: "/admin/calendar", labelKey: "nav.calendar", icon: CalendarDays },
  { to: "/admin/fees", labelKey: "nav.fees", icon: DollarSign },
  { to: "/admin/import", labelKey: "nav.bulkImport", icon: ClipboardList },
  { to: "/admin/reports", labelKey: "nav.reports", icon: FileText },
  { to: "/admin/audit-log", labelKey: "nav.auditLog", icon: ScrollText },
  { to: "/admin/governance", labelKey: "nav.aiGovernance", icon: ShieldAlert },
  { to: "/admin/security", labelKey: "nav.security", icon: ShieldAlert },
  { to: "/admin/bonus-events", labelKey: "nav.bonusXp", icon: Sparkles },
  {
    to: "/admin/badges",
    labelKey: "nav.badgeDefinitions",
    icon: Award,
  },
  {
    to: "/admin/badges/spotlight",
    labelKey: "nav.badgeSpotlight",
    icon: Award,
  },
  { to: "/admin/marketplace", labelKey: "nav.marketplace", icon: Store },
  { to: "/admin/surveys", labelKey: "nav.surveys", icon: ClipboardList },
  { to: "/admin/notifications", labelKey: "nav.notifications", icon: Bell },
];

const coordinatorNavItems: NavItem[] = [
  {
    to: "/coordinator/dashboard",
    labelKey: "nav.dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/coordinator/settings/profile",
    labelKey: "nav.me",
    icon: UserCog,
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
  {
    to: "/coordinator/accreditation",
    labelKey: "nav.accreditation",
    icon: ClipboardCheck,
  },
  {
    to: "/coordinator/team-health",
    labelKey: "nav.teamHealthReport",
    icon: HeartPulse,
  },
  {
    to: "/coordinator/competencies",
    labelKey: "nav.competencyFrameworks",
    icon: Workflow,
  },
  {
    to: "/coordinator/discussions",
    labelKey: "nav.discussions",
    icon: MessageSquare,
  },
  { to: "/coordinator/timetable", labelKey: "nav.timetable", icon: Clock },
  {
    to: "/coordinator/notifications",
    labelKey: "nav.notifications",
    icon: Bell,
  },
];

const teacherNavItems: NavItem[] = [
  {
    to: "/teacher/dashboard",
    labelKey: "nav.dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/teacher/settings/profile",
    labelKey: "nav.me",
    icon: UserCog,
  },
  {
    to: "/teacher/students",
    labelKey: "nav.students",
    icon: Users,
  },
  { to: "/teacher/grading", labelKey: "nav.grading", icon: CheckSquare },
  { to: "/teacher/gradebook", labelKey: "nav.gradebook", icon: BookOpen },
  { to: "/teacher/modules", labelKey: "nav.modules", icon: FolderOpen },
  {
    to: "/teacher/questions",
    labelKey: "nav.questionBank",
    icon: FileQuestion,
  },
  { to: "/teacher/rubrics", labelKey: "nav.rubrics", icon: TableProperties },
  { to: "/teacher/content", labelKey: "nav.courseMaterials", icon: BookOpen },
  {
    to: "/teacher/tutor-handoffs",
    labelKey: "nav.tutorHandoffs",
    icon: Handshake,
  },
  { to: "/teacher/attendance", labelKey: "nav.attendance", icon: CalendarDays },
  {
    to: "/teacher/discussions",
    labelKey: "nav.discussions",
    icon: MessageSquare,
  },
  {
    to: "/teacher/announcements",
    labelKey: "nav.announcements",
    icon: Megaphone,
  },
  { to: "/teacher/notifications", labelKey: "nav.notifications", icon: Bell },
];

const studentNavItems: NavItem[] = [
  {
    to: "/student/dashboard",
    labelKey: "nav.mobile.home",
    icon: LayoutDashboard,
    group: "tools",
  },
  {
    to: "/student/learning-path",
    labelKey: "nav.mobile.learn",
    icon: BookOpen,
    group: "learn",
  },
  {
    to: "/student/tutor",
    labelKey: "nav.mobile.tutor",
    icon: Bot,
    group: "learn",
  },
  {
    to: "/student/progress",
    labelKey: "nav.mobile.progress",
    icon: TrendingUp,
    group: "growth",
  },
  {
    to: "/student/profile",
    labelKey: "nav.me",
    icon: UserCog,
    group: "growth",
  },
  {
    to: "/student/courses",
    labelKey: "nav.coursesTasks",
    icon: ClipboardListIcon,
    group: "learn",
  },
  {
    to: "/student/assignments",
    labelKey: "nav.assignments",
    icon: ClipboardListIcon,
    group: "learn",
  },
  {
    to: "/student/today",
    labelKey: "nav.dailyReview",
    icon: CalendarCheck,
    group: "tools",
  },
  {
    to: "/student/habits",
    labelKey: "nav.wellness",
    icon: HeartPulse,
    group: "growth",
  },
  {
    to: "/student/planner",
    labelKey: "nav.focus",
    icon: Clock,
    group: "tools",
  },
  {
    to: "/student/challenges",
    labelKey: "nav.quests",
    icon: Swords,
    group: "growth",
  },
  {
    to: "/student/leaderboard",
    labelKey: "nav.leaderboard",
    icon: Trophy,
    group: "community",
  },
  {
    to: "/student/team",
    labelKey: "nav.myTeam",
    icon: Users,
    group: "community",
  },
  {
    to: "/student/journal",
    labelKey: "nav.journal",
    icon: PenLine,
    group: "tools",
  },
  {
    to: "/student/calendar",
    labelKey: "nav.calendar",
    icon: Calendar,
    group: "tools",
  },
  {
    to: "/student/marketplace",
    labelKey: "nav.shop",
    icon: Store,
    group: "growth",
  },
  {
    to: "/student/notifications",
    labelKey: "nav.notifications",
    icon: Bell,
    group: "tools",
  },
  {
    to: "/student/settings/profile",
    labelKey: "nav.settings",
    icon: UserCog,
    group: "tools",
  },
  {
    to: "/student/surveys",
    labelKey: "nav.surveys",
    icon: FileQuestion,
    group: "tools",
  },
  { to: "/student/fees", labelKey: "nav.fees", icon: Wallet, group: "tools" },
  {
    to: "/student/content",
    labelKey: "nav.myContent",
    icon: FileText,
    group: "learn",
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
    to: "/student/badges",
    labelKey: "nav.badges",
    icon: Award,
    group: "growth",
  },
];

const parentNavItems: NavItem[] = [
  { to: "/parent/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/parent/progress", labelKey: "nav.progress", icon: TrendingUp },
  { to: "/parent/support", labelKey: "nav.support", icon: Megaphone },
  { to: "/parent/profile", labelKey: "nav.me", icon: UserCog },
  { to: "/parent/attendance", labelKey: "nav.attendance", icon: CalendarDays },
  { to: "/parent/fees", labelKey: "nav.fees", icon: Wallet },
  {
    to: "/parent/communications",
    labelKey: "nav.announcements",
    icon: Megaphone,
  },
];

export const navItems: Record<UserRole, NavItem[]> = {
  admin: adminNavItems,
  coordinator: coordinatorNavItems,
  teacher: teacherNavItems,
  student: studentNavItems,
  parent: parentNavItems,
};
