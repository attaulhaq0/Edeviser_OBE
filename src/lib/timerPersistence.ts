// =============================================================================
// Focus Mode Timer — localStorage Persistence
// =============================================================================

import type { TimerPersistState } from "@/types/planner";

const TIMER_STATE_KEY = "edeviser_focus_timer";

/** Persist timer state to localStorage. */
export function persistTimerState(state: TimerPersistState): void {
  localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));
}

/** Restore timer state from localStorage. Returns null if not found or invalid. */
export function restoreTimerState(): TimerPersistState | null {
  const raw = localStorage.getItem(TIMER_STATE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TimerPersistState;
  } catch {
    return null;
  }
}

/** Clear persisted timer state from localStorage. */
export function clearTimerState(): void {
  localStorage.removeItem(TIMER_STATE_KEY);
}
