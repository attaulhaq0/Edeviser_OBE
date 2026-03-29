import type { AttainmentLevel, AttainmentThresholdsConfig } from '@/types/app';
import { DEFAULT_ATTAINMENT_THRESHOLDS } from '@/types/app';

/**
 * Classifies a score percentage into an attainment level using configurable thresholds.
 * Falls back to default thresholds (85/70/50) when no config is provided.
 */
export function classifyAttainment(
  percent: number,
  thresholds: AttainmentThresholdsConfig = DEFAULT_ATTAINMENT_THRESHOLDS,
): AttainmentLevel {
  if (percent >= thresholds.excellent) return 'Excellent';
  if (percent >= thresholds.satisfactory) return 'Satisfactory';
  if (percent >= thresholds.developing) return 'Developing';
  return 'Not_Yet';
}

/**
 * Returns the Tailwind color class for an attainment percentage.
 */
export function getAttainmentColor(
  percent: number,
  thresholds: AttainmentThresholdsConfig = DEFAULT_ATTAINMENT_THRESHOLDS,
): string {
  if (percent < 0) return '#e5e7eb';
  if (percent >= thresholds.excellent) return '#22c55e';
  if (percent >= thresholds.satisfactory) return '#3b82f6';
  if (percent >= thresholds.developing) return '#eab308';
  return '#ef4444';
}

/**
 * Returns the Tailwind text color class for an attainment percentage.
 */
export function getAttainmentTextClass(
  percent: number,
  thresholds: AttainmentThresholdsConfig = DEFAULT_ATTAINMENT_THRESHOLDS,
): string {
  if (percent >= thresholds.excellent) return 'text-green-600';
  if (percent >= thresholds.satisfactory) return 'text-blue-600';
  if (percent >= thresholds.developing) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Returns the badge style class for an attainment percentage.
 */
export function getAttainmentBadgeStyle(
  percent: number,
  thresholds: AttainmentThresholdsConfig = DEFAULT_ATTAINMENT_THRESHOLDS,
): string {
  if (percent >= thresholds.excellent) return 'bg-green-50 text-green-600 border-green-200';
  if (percent >= thresholds.satisfactory) return 'bg-blue-50 text-blue-600 border-blue-200';
  if (percent >= thresholds.developing) return 'bg-yellow-50 text-yellow-600 border-yellow-200';
  return 'bg-red-50 text-red-600 border-red-200';
}
