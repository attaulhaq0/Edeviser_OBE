import { describe, it, expect } from 'vitest';

// Inline the pure function from the edge function for unit testing
function computeAttendanceFrequency(
  presentOrLate: number,
  totalSessions: number,
): 'low' | 'medium' | 'high' {
  if (totalSessions === 0) return 'high';
  const ratio = presentOrLate / totalSessions;
  if (ratio >= 0.85) return 'high';
  if (ratio >= 0.65) return 'medium';
  return 'low';
}

describe('computeAttendanceFrequency', () => {
  it('returns high when no sessions exist', () => {
    expect(computeAttendanceFrequency(0, 0)).toBe('high');
  });

  it('returns high for ≥85% attendance', () => {
    expect(computeAttendanceFrequency(9, 10)).toBe('high');
    expect(computeAttendanceFrequency(10, 10)).toBe('high');
  });

  it('returns medium for 65-84% attendance', () => {
    expect(computeAttendanceFrequency(7, 10)).toBe('medium');
    expect(computeAttendanceFrequency(8, 10)).toBe('medium');
  });

  it('returns low for <65% attendance', () => {
    expect(computeAttendanceFrequency(6, 10)).toBe('low');
    expect(computeAttendanceFrequency(3, 10)).toBe('low');
    expect(computeAttendanceFrequency(0, 10)).toBe('low');
  });

  it('handles boundary at 85%', () => {
    // 85% exactly → high
    expect(computeAttendanceFrequency(85, 100)).toBe('high');
    // 84% → medium
    expect(computeAttendanceFrequency(84, 100)).toBe('medium');
  });

  it('handles boundary at 65%', () => {
    // 65% exactly → medium
    expect(computeAttendanceFrequency(65, 100)).toBe('medium');
    // 64% → low
    expect(computeAttendanceFrequency(64, 100)).toBe('low');
  });
});
