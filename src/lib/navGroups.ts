// Task 6.16: Student navigation group metadata + placement validation (pure business logic)
// Requirements: 20.6

/**
 * The four labeled sections the student navigation is grouped into (R20.1).
 * - `learn`     → Courses, Assignments, AI Tutor
 * - `growth`    → Habits, Progress, Challenges
 * - `community` → Leaderboard, My Team
 * - `tools`     → Calendar, Planner, Journal
 */
export type NavGroup = "learn" | "growth" | "community" | "tools";

/**
 * Canonical render order of the navigation groups. Also serves as the single
 * source of truth for the set of valid groups, used by the {@link isNavGroup}
 * type guard.
 */
export const NAV_GROUPS: readonly NavGroup[] = [
  "learn",
  "growth",
  "community",
  "tools",
] as const;

/**
 * Display metadata for a navigation group. `labelKey` is an i18next key in the
 * `common:nav.groups.*` namespace so the sidebar can render bilingual section
 * labels (R20.4); `order` fixes the section order in the sidebar.
 */
export interface NavGroupMeta {
  group: NavGroup;
  labelKey: string;
  order: number;
}

/**
 * Metadata for every navigation group. The `labelKey` values resolve to the
 * en/ar section labels added by the sidebar-rendering task; this module only
 * owns the structural metadata, not the translation strings.
 */
export const NAV_GROUP_META: Record<NavGroup, NavGroupMeta> = {
  learn: { group: "learn", labelKey: "nav.groups.learn", order: 0 },
  growth: { group: "growth", labelKey: "nav.groups.growth", order: 1 },
  community: { group: "community", labelKey: "nav.groups.community", order: 2 },
  tools: { group: "tools", labelKey: "nav.groups.tools", order: 3 },
};

/**
 * Required placements for the student navigation items enumerated in R20.1,
 * keyed by route (`NavItem.to`). These are the placements validation enforces:
 * an item whose route appears here MUST be assigned to the mapped group
 * (in particular the AI Tutor route `/student/tutor` MUST belong to `learn`,
 * per R20.6). Routes not listed here have no mandated group and may be assigned
 * to any defined group by the navigation-assignment task.
 */
export const REQUIRED_NAV_GROUPS: Readonly<Record<string, NavGroup>> = {
  // Learn
  "/student/courses": "learn",
  "/student/assignments": "learn",
  "/student/tutor": "learn", // AI Tutor ∈ Learn (R20.6)
  // Growth
  "/student/habits": "growth",
  "/student/progress": "growth",
  "/student/challenges": "growth",
  // Community
  "/student/leaderboard": "community",
  "/student/team": "community",
  // Tools
  "/student/calendar": "tools",
  "/student/planner": "tools",
  "/student/journal": "tools",
};

/**
 * The minimal shape required to validate a navigation item's group placement.
 * Declared locally (rather than importing `NavItem`) so this pure module has no
 * dependency on `navItems.ts` — `navItems.ts` is the consumer that imports
 * {@link NavGroup} from here, and the reverse import would be circular.
 */
export interface NavGroupAssignment {
  to: string;
  group?: NavGroup;
}

/** Error thrown by {@link assertNavGroup} when a placement is invalid. */
export class NavGroupAssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NavGroupAssignmentError";
  }
}

/** Type guard: narrows an arbitrary value to a defined {@link NavGroup}. */
export function isNavGroup(value: unknown): value is NavGroup {
  return (
    typeof value === "string" &&
    (NAV_GROUPS as readonly string[]).includes(value)
  );
}

/**
 * Returns the group a route is required to belong to, or `undefined` when the
 * route has no mandated placement.
 */
export function getRequiredNavGroup(to: string): NavGroup | undefined {
  return REQUIRED_NAV_GROUPS[to];
}

/**
 * Non-throwing predicate form of {@link assertNavGroup}. Returns `true` when the
 * item is assigned to a defined group AND that group satisfies any required
 * placement for its route; `false` otherwise. Useful for filtering/rendering and
 * for property tests.
 */
export function isValidNavGroupAssignment(item: NavGroupAssignment): boolean {
  if (!isNavGroup(item.group)) return false;
  const required = getRequiredNavGroup(item.to);
  return required === undefined || item.group === required;
}

/**
 * Asserts that a navigation item is assigned to a valid group and satisfies its
 * required placement (R20.6). Throws {@link NavGroupAssignmentError} when:
 * - the item has no group, or a group that is not one of the defined groups; or
 * - the item's route has a required placement and the assigned group differs
 *   from it (e.g. the AI Tutor route assigned to any group other than `learn`).
 *
 * This is a pure, total assertion: every input yields either a successful
 * narrowing or a thrown error — there is no silent acceptance of an invalid
 * placement.
 */
export function assertNavGroup(
  item: NavGroupAssignment
): asserts item is Required<NavGroupAssignment> {
  if (!isNavGroup(item.group)) {
    throw new NavGroupAssignmentError(
      `Navigation item "${
        item.to
      }" must be assigned to one of: ${NAV_GROUPS.join(
        ", "
      )} (received: ${String(item.group)}).`
    );
  }

  const required = getRequiredNavGroup(item.to);
  if (required !== undefined && item.group !== required) {
    throw new NavGroupAssignmentError(
      `Navigation item "${item.to}" must belong to the "${required}" group but was assigned to "${item.group}".`
    );
  }
}
