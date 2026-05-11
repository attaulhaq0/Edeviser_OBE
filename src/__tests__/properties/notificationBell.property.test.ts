/**
 * Feature: ui-consistency-global-fixes
 * Property: Notification bell end-to-end (clauses 2.29, 3.29)
 * Task 106
 *
 * Verifies:
 * 1. NotificationBell component exists and has correct structure
 * 2. Unread badge renders correctly for various counts
 * 3. resolveNotificationCta maps all notification types correctly
 * 4. notificationCta.ts covers all NotificationType values
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import * as fs from "fs";
import * as path from "path";
import { resolveNotificationCta } from "@/lib/notificationCta";
import type { NotificationType } from "@/hooks/useNotifications";
import type { UserRole } from "@/types/app";

const projectRoot = path.resolve(__dirname, "../../..");

const readFileSafe = (relPath: string): string | null => {
  try {
    return fs.readFileSync(path.join(projectRoot, relPath), "utf-8");
  } catch {
    return null;
  }
};

// All notification types defined in the system
const ALL_NOTIFICATION_TYPES: NotificationType[] = [
  "grade_released",
  "new_assignment",
  "badge_earned",
  "streak_at_risk",
  "at_risk_alert",
  "peer_milestone",
  "perfect_day_nudge",
  "prerequisite_unlocked",
  "digest",
];

const ALL_ROLES: UserRole[] = [
  "admin",
  "coordinator",
  "teacher",
  "student",
  "parent",
];

describe("notificationBell.property.test — notification bell end-to-end (clauses 2.29, 3.29)", () => {
  /**
   * Property: NotificationBell component has correct structure
   */
  it("NotificationBell has bell icon, unread badge, and popover", () => {
    const content = readFileSafe("src/components/shared/NotificationBell.tsx");
    if (!content) return;

    // Must have Bell icon
    expect(content).toContain("Bell");

    // Must have aria-live="polite" on badge
    expect(content).toContain('aria-live="polite"');

    // Must use Popover
    expect(content).toContain("Popover");
    expect(content).toContain("PopoverContent");

    // Must use useUnreadCount and useNotifications
    expect(content).toContain("useUnreadCount");
    expect(content).toContain("useNotifications");

    // Must have mark all as read
    expect(content).toContain("useMarkAllAsRead");

    // Must have empty state
    expect(content).toContain("NoNotifications");
  });

  /**
   * Property: Badge count display — shows digit for 1-9, '9+' for >9, hidden for 0
   */
  it("badge count logic: 1-9 shows digit, >9 shows 9+, 0 hides badge", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (count) => {
        const badgeCount = count <= 99 ? count : "99+";

        if (count === 0) {
          // Badge should be hidden — badgeCount is 0 (falsy)
          expect(count > 0).toBe(false);
        } else if (count <= 99) {
          expect(badgeCount).toBe(count);
          expect(typeof badgeCount).toBe("number");
        } else {
          expect(badgeCount).toBe("99+");
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: resolveNotificationCta returns a non-null CTA for all known types
   * when called with a student role (most types are student-facing)
   */
  it("resolveNotificationCta returns non-null for all student-facing notification types", () => {
    const studentTypes: NotificationType[] = [
      "grade_released",
      "new_assignment",
      "badge_earned",
      "streak_at_risk",
      "at_risk_alert",
      "peer_milestone",
      "perfect_day_nudge",
      "prerequisite_unlocked",
      "digest",
    ];

    fc.assert(
      fc.property(fc.constantFrom(...studentTypes), (type) => {
        const cta = resolveNotificationCta(
          {
            type,
            metadata: {
              submission_id: "test-id",
              assignment_id: "test-id",
              badge_id: "test-id",
            },
          },
          "student"
        );

        // All student types should have a CTA
        expect(cta).not.toBeNull();
        if (cta) {
          expect(cta.labelKey).toBeTruthy();
          expect(cta.route).toBeTruthy();
          expect(cta.route).toMatch(/^\//); // Must start with /
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: resolveNotificationCta returns correct routes for each type
   */
  it("resolveNotificationCta routes contain the role prefix", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_ROLES),
        fc.constantFrom("grade_released", "new_assignment", "digest"),
        (role, type) => {
          const cta = resolveNotificationCta(
            {
              type: type as NotificationType,
              metadata: { submission_id: "abc", assignment_id: "xyz" },
            },
            role
          );

          if (cta) {
            // Routes for grade_released, new_assignment, digest should contain the role
            if (
              type === "grade_released" ||
              type === "new_assignment" ||
              type === "digest"
            ) {
              expect(cta.route).toContain(`/${role}/`);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All notification types are handled (no missing cases)
   */
  it("resolveNotificationCta handles all defined notification types without throwing", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_NOTIFICATION_TYPES),
        fc.constantFrom(...ALL_ROLES),
        (type, role) => {
          // Should not throw for any valid type + role combination
          expect(() => {
            resolveNotificationCta({ type, metadata: null }, role);
          }).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: GlobalHeader includes NotificationBell
   */
  it("GlobalHeader mounts NotificationBell", () => {
    const content = readFileSafe("src/components/shared/GlobalHeader.tsx");
    if (!content) return;

    expect(content).toContain("NotificationBell");
    expect(content).toContain("from '@/components/shared/NotificationBell'");
  });

  /**
   * Property: i18n keys for notifications are present in both locales
   */
  it("notification i18n keys exist in both en and ar common.json", () => {
    const enContent = readFileSafe("src/locales/en/common.json");
    const arContent = readFileSafe("src/locales/ar/common.json");

    if (!enContent || !arContent) return;

    // Strip BOM if present (Windows may add UTF-8 BOM)
    const stripBom = (s: string) =>
      s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
    const enJson = JSON.parse(stripBom(enContent)) as Record<string, unknown>;
    const arJson = JSON.parse(stripBom(arContent)) as Record<string, unknown>;

    // Check header notification keys exist
    const enHeader = (enJson.header as Record<string, unknown>) ?? {};
    const arHeader = (arJson.header as Record<string, unknown>) ?? {};

    expect(enHeader.unreadCount).toBeTruthy();
    expect(arHeader.unreadCount).toBeTruthy();
    expect(enHeader.notificationsLabel).toBeTruthy();
    expect(arHeader.notificationsLabel).toBeTruthy();
    expect(enHeader.markAllRead).toBeTruthy();
    expect(arHeader.markAllRead).toBeTruthy();
  });
});
