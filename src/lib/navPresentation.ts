import {
  BarChart3,
  BookOpen,
  Bot,
  CheckSquare,
  FileText,
  FolderOpen,
  Grid3X3,
  Home,
  LayoutDashboard,
  Target,
  Megaphone,
  TrendingUp,
  User,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { navItems, type NavItem } from "@/lib/navItems";
import type { UserRole } from "@/types/app";

interface PrototypeDesktopItem {
  to: string;
  labelKey: string;
  emoji: string;
}

export interface PresentedNavItem extends NavItem {
  emoji: string;
}

/**
 * Primary desktop treatment remains role-curated, while canonical `navItems`
 * determines destination ownership and MORE order. Mobile core tabs use a
 * finite subset; the drawer makes every listed destination reachable.
 */
const desktopPrimaryByRole: Record<UserRole, PrototypeDesktopItem[]> = {
  student: [
    { to: "/student/dashboard", labelKey: "nav.mobile.home", emoji: "🏠" },
    { to: "/student/learning-path", labelKey: "nav.mobile.learn", emoji: "🗺️" },
    { to: "/student/tutor", labelKey: "nav.mobile.tutor", emoji: "🤖" },
    { to: "/student/progress", labelKey: "nav.mobile.progress", emoji: "📈" },
    { to: "/student/profile", labelKey: "nav.me", emoji: "🙂" },
  ],
  teacher: [
    { to: "/teacher/dashboard", labelKey: "nav.mobile.home", emoji: "🏠" },
    { to: "/teacher/students", labelKey: "nav.mobile.students", emoji: "🧑‍🎓" },
    { to: "/teacher/modules", labelKey: "nav.mobile.studio", emoji: "🧬" },
    { to: "/teacher/grading", labelKey: "nav.mobile.grade", emoji: "✍️" },
    { to: "/teacher/settings/profile", labelKey: "nav.me", emoji: "🙂" },
  ],
  parent: [
    { to: "/parent/dashboard", labelKey: "nav.mobile.home", emoji: "🏠" },
    { to: "/parent/progress", labelKey: "nav.mobile.growth", emoji: "🌱" },
    { to: "/parent/support", labelKey: "nav.mobile.support", emoji: "💬" },
    { to: "/parent/profile", labelKey: "nav.me", emoji: "🙂" },
  ],
  coordinator: [
    { to: "/coordinator/dashboard", labelKey: "nav.mobile.home", emoji: "🏠" },
    { to: "/coordinator/plos", labelKey: "nav.mobile.outcomes", emoji: "🎯" },
    {
      to: "/coordinator/matrix",
      labelKey: "nav.mobile.curriculum",
      emoji: "🗂️",
    },
    {
      to: "/coordinator/accreditation",
      labelKey: "nav.mobile.accredit",
      emoji: "📋",
    },
    { to: "/coordinator/settings/profile", labelKey: "nav.me", emoji: "🙂" },
  ],
  admin: [
    { to: "/admin/dashboard", labelKey: "nav.mobile.home", emoji: "🏠" },
    { to: "/admin/analytics", labelKey: "nav.mobile.analytics", emoji: "📊" },
    { to: "/admin/governance", labelKey: "nav.mobile.aiGov", emoji: "🛡️" },
    { to: "/admin/users", labelKey: "nav.mobile.people", emoji: "👥" },
    { to: "/admin/settings/profile", labelKey: "nav.me", emoji: "🙂" },
  ],
};

/**
 * Presentation treatments only; navItems owns which destinations exist and
 * their order. Repeat links or mislabeled aliases must not compete with it.
 */
const desktopMoreByRole: Record<UserRole, PrototypeDesktopItem[]> = {
  student: [
    { to: "/student/courses", labelKey: "nav.coursesTasks", emoji: "📚" },
    { to: "/student/today", labelKey: "nav.dailyReview", emoji: "🔁" },
    { to: "/student/habits", labelKey: "nav.wellness", emoji: "💚" },
    { to: "/student/planner", labelKey: "nav.focus", emoji: "⏱️" },
    { to: "/student/challenges", labelKey: "nav.quests", emoji: "⚔️" },
    { to: "/student/leaderboard", labelKey: "nav.leaderboard", emoji: "🏆" },
    { to: "/student/team", labelKey: "nav.myTeam", emoji: "👥" },
    { to: "/student/journal", labelKey: "nav.journal", emoji: "📖" },
    { to: "/student/calendar", labelKey: "nav.calendar", emoji: "📅" },
    { to: "/student/marketplace", labelKey: "nav.shop", emoji: "🛍️" },
    {
      to: "/student/notifications",
      labelKey: "nav.notifications",
      emoji: "🔔",
    },
  ],
  teacher: [
    { to: "/teacher/questions", labelKey: "nav.questionBank", emoji: "🧠" },
    { to: "/teacher/rubrics", labelKey: "nav.rubricBuilder", emoji: "📐" },
    {
      to: "/teacher/tutor-handoffs",
      labelKey: "nav.tutorHandoffs",
      emoji: "🧭",
    },
    { to: "/teacher/gradebook", labelKey: "nav.gradebook", emoji: "📊" },
    { to: "/teacher/attendance", labelKey: "nav.attendance", emoji: "🗓️" },
    { to: "/teacher/discussions", labelKey: "nav.discussions", emoji: "💭" },
    {
      to: "/teacher/announcements",
      labelKey: "nav.announcements",
      emoji: "📣",
    },
    {
      to: "/teacher/notifications",
      labelKey: "nav.notifications",
      emoji: "🔔",
    },
  ],
  parent: [
    { to: "/parent/attendance", labelKey: "nav.attendance", emoji: "🗓️" },
    { to: "/parent/fees", labelKey: "nav.feesPayments", emoji: "💳" },
    {
      to: "/parent/communications",
      labelKey: "nav.announcements",
      emoji: "📣",
    },
  ],
  coordinator: [
    { to: "/coordinator/cqi", labelKey: "nav.cqiPlans", emoji: "🔧" },
    {
      to: "/coordinator/course-file",
      labelKey: "nav.courseFileGenerator",
      emoji: "📘",
    },
    {
      to: "/coordinator/team-health",
      labelKey: "nav.teamHealthReport",
      emoji: "👥",
    },
    {
      to: "/coordinator/competencies",
      labelKey: "nav.competencyFrameworks",
      emoji: "🧭",
    },
    {
      to: "/coordinator/discussions",
      labelKey: "nav.discussions",
      emoji: "💭",
    },
    {
      to: "/coordinator/notifications",
      labelKey: "nav.notifications",
      emoji: "🔔",
    },
  ],
  admin: [
    { to: "/admin/marketplace", labelKey: "nav.marketplace", emoji: "🛍️" },
    {
      to: "/admin/settings/configuration",
      labelKey: "nav.institutionSettings",
      emoji: "🏛️",
    },
    { to: "/admin/import", labelKey: "nav.bulkImport", emoji: "📥" },
    { to: "/admin/badges", labelKey: "nav.badgeDefinitions", emoji: "🏅" },
    { to: "/admin/security", labelKey: "nav.security", emoji: "🔒" },
    { to: "/admin/fees", labelKey: "nav.feesManagement", emoji: "💳" },
    { to: "/admin/announcements", labelKey: "nav.announcements", emoji: "📣" },
    { to: "/admin/notifications", labelKey: "nav.notifications", emoji: "🔔" },
  ],
};

/** Central raised action in the mobile tab bar; each points to an existing route. */
export const mobileFabPathByRole: Record<UserRole, string> = {
  student: "/student/tutor",
  teacher: "/teacher/modules",
  parent: "/parent/support",
  coordinator: "/coordinator/matrix",
  admin: "/admin/governance",
};

export interface MobileTabItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  raised?: boolean;
}

const mobileTabsByRole: Record<UserRole, MobileTabItem[]> = {
  student: [
    {
      to: "/student/dashboard",
      labelKey: "nav.mobile.home",
      icon: Home,
    },
    {
      to: "/student/learning-path",
      labelKey: "nav.mobile.learn",
      icon: BookOpen,
    },
    {
      to: "/student/tutor",
      labelKey: "nav.mobile.tutor",
      icon: Bot,
      raised: true,
    },
    {
      to: "/student/progress",
      labelKey: "nav.mobile.progress",
      icon: TrendingUp,
    },
    { to: "/student/profile", labelKey: "nav.me", icon: User },
  ],
  teacher: [
    {
      to: "/teacher/dashboard",
      labelKey: "nav.mobile.home",
      icon: LayoutDashboard,
    },
    { to: "/teacher/students", labelKey: "nav.mobile.students", icon: Users },
    {
      to: "/teacher/modules",
      labelKey: "nav.mobile.studio",
      icon: FolderOpen,
      raised: true,
    },
    { to: "/teacher/grading", labelKey: "nav.mobile.grade", icon: CheckSquare },
    { to: "/teacher/settings/profile", labelKey: "nav.me", icon: UserCog },
  ],
  parent: [
    {
      to: "/parent/dashboard",
      labelKey: "nav.mobile.home",
      icon: LayoutDashboard,
    },
    { to: "/parent/progress", labelKey: "nav.mobile.growth", icon: TrendingUp },
    {
      to: "/parent/support",
      labelKey: "nav.mobile.support",
      icon: Megaphone,
      raised: true,
    },
    { to: "/parent/profile", labelKey: "nav.me", icon: UserCog },
  ],
  coordinator: [
    {
      to: "/coordinator/dashboard",
      labelKey: "nav.mobile.home",
      icon: LayoutDashboard,
    },
    { to: "/coordinator/plos", labelKey: "nav.mobile.outcomes", icon: Target },
    {
      to: "/coordinator/matrix",
      labelKey: "nav.mobile.curriculum",
      icon: Grid3X3,
      raised: true,
    },
    {
      to: "/coordinator/accreditation",
      labelKey: "nav.mobile.accredit",
      icon: FileText,
    },
    { to: "/coordinator/settings/profile", labelKey: "nav.me", icon: UserCog },
  ],
  admin: [
    {
      to: "/admin/dashboard",
      labelKey: "nav.mobile.home",
      icon: LayoutDashboard,
    },
    {
      to: "/admin/analytics",
      labelKey: "nav.mobile.analytics",
      icon: BarChart3,
    },
    {
      to: "/admin/governance",
      labelKey: "nav.mobile.aiGov",
      icon: Bot,
      raised: true,
    },
    { to: "/admin/users", labelKey: "nav.mobile.people", icon: Users },
    { to: "/admin/settings/profile", labelKey: "nav.me", icon: UserCog },
  ],
};

const presentItems = (
  role: UserRole,
  definitions: PrototypeDesktopItem[]
): PresentedNavItem[] => {
  const itemsByPath = new Map(
    (navItems[role] ?? []).map((item) => [item.to, item])
  );
  return definitions.map((definition) => {
    const item = itemsByPath.get(definition.to);
    if (!item)
      throw new Error(
        `Undeclared ${role} navigation destination: ${definition.to}`
      );
    return { ...item, labelKey: definition.labelKey, emoji: definition.emoji };
  });
};

export const getPrimaryNavItems = (role: UserRole): PresentedNavItem[] =>
  presentItems(role, desktopPrimaryByRole[role]).map((item) => {
    const mobile = mobileTabsByRole[role].find(
      (candidate) => candidate.to === item.to
    );
    return mobile
      ? { ...item, labelKey: mobile.labelKey, icon: mobile.icon }
      : item;
  });

/** Every canonical destination appears exactly once in primary or MORE. */
export const getMoreNavItems = (role: UserRole): PresentedNavItem[] => {
  const primaryPaths = new Set(getPrimaryNavItems(role).map((item) => item.to));
  const treatments = new Map<string, PresentedNavItem>();
  for (const item of presentItems(role, desktopMoreByRole[role])) {
    if (primaryPaths.has(item.to) || treatments.has(item.to))
      throw new Error(`Repeated ${role} MORE destination: ${item.to}`);
    treatments.set(item.to, item);
  }
  return navItems[role]
    .filter((item) => !primaryPaths.has(item.to))
    .map((item) => treatments.get(item.to) ?? { ...item, emoji: "" });
};

/** The bottom bar is intentionally a subset; the mobile drawer contains MORE. */
export const getMobileTabItems = (role: UserRole): MobileTabItem[] =>
  mobileTabsByRole[role].map((item) => {
    if (!navItems[role].some((source) => source.to === item.to))
      throw new Error(`Undeclared ${role} mobile tab: ${item.to}`);
    return item;
  });
