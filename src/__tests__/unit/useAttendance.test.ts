import { describe, it, expect } from 'vitest';
import { calculateAttendancePercent } from '@/hooks/useAttendance';

describe('calculateAttendancePercent', () => {
  it('returns 100 when no sessions exist', () => {
    expect(calculateAttendancePercent(0, 0, 0)).toBe(100);
  });

  it('counts present + late as attended', () => {
    // 5 present + 2 late out of 10 sessions = 70%
    expect(calculateAttendancePercent(5, 2, 10)).toBe(70);
  });

  it('returns 100% when all present', () => {
    expect(calculateAttendancePercent(10, 0, 10)).toBe(100);
  });

  it('returns 0% when all absent', () => {
    expect(calculateAttendancePercent(0, 0, 5)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    // 1 present + 0 late out of 3 sessions = 33.33... → 33
    expect(calculateAttendancePercent(1, 0, 3)).toBe(33);
  });

  it('handles late-only attendance', () => {
    // 0 present + 3 late out of 4 sessions = 75%
    expect(calculateAttendancePercent(0, 3, 4)).toBe(75);
  });
});
