import type { Page } from "@playwright/test";

export const MINIMUM_TOUCH_TARGET: 44;
export interface TouchTarget {
  element: string;
  name: string;
  width: number;
  height: number;
}
export interface TouchTargetReport {
  minimum: number;
  checked: number;
  targets: TouchTarget[];
  excluded: Array<TouchTarget & { reason: string }>;
  violations: TouchTarget[];
}
export function scanTouchTargets(page: Page): Promise<TouchTargetReport>;
export function assertTouchTargets(report: TouchTargetReport): void;
