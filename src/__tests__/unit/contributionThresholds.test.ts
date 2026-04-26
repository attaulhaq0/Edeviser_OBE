// =============================================================================
// Contribution Thresholds — Unit tests (Task 11.2)
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CONTRIBUTION_THRESHOLD,
  DAYS_TO_WARNING,
  DAYS_TO_INACTIVE,
  computeContributionStatus,
  meetsContributionThreshold,
  updateContributionTracking,
} from '@/lib/contributionThresholds';

describe('DEFAULT_CONTRIBUTION_THRESHOLD', () => {
  it('is 20%', () => {
    expect(DEFAULT_CONTRIBUTION_THRESHOLD).toBe(20);
  });
});

describe('Status transition constants', () => {
  it('transitions to warning after 3 days', () => {
    expect(DAYS_TO_WARNING).toBe(3);
  });

  it('transitions to inactive after 5 days', () => {
    expect(DAYS_TO_INACTIVE).toBe(5);
  });
});

describe('computeContributionStatus', () => {
  it('returns "active" for 0 consecutive low days', () => {
    expect(computeContributionStatus(0)).toBe('active');
  });

  it('returns "active" for 2 consecutive low days', () => {
    expect(computeContributionStatus(2)).toBe('active');
  });

  it('returns "warning" for 3 consecutive low days', () => {
    expect(computeContributionStatus(3)).toBe('warning');
  });

  it('returns "warning" for 4 consecutive low days', () => {
    expect(computeContributionStatus(4)).toBe('warning');
  });

  it('returns "inactive" for 5 consecutive low days', () => {
    expect(computeContributionStatus(5)).toBe('inactive');
  });

  it('returns "inactive" for 10 consecutive low days', () => {
    expect(computeContributionStatus(10)).toBe('inactive');
  });
});

describe('meetsContributionThreshold', () => {
  it('returns true when contribution meets threshold', () => {
    // 200 / 1000 = 20% — exactly at threshold
    expect(meetsContributionThreshold(200, 1000)).toBe(true);
  });

  it('returns false when contribution is below threshold', () => {
    // 100 / 1000 = 10% — below 20%
    expect(meetsContributionThreshold(100, 1000)).toBe(false);
  });

  it('returns true when team total XP is 0 (no activity)', () => {
    expect(meetsContributionThreshold(0, 0)).toBe(true);
  });

  it('returns true when contribution exceeds threshold', () => {
    // 500 / 1000 = 50% — above 20%
    expect(meetsContributionThreshold(500, 1000)).toBe(true);
  });
});

describe('updateContributionTracking', () => {
  it('resets to active when member meets threshold', () => {
    const result = updateContributionTracking(4, true);
    expect(result.status).toBe('active');
    expect(result.consecutiveLowDays).toBe(0);
  });

  it('increments consecutive low days when below threshold', () => {
    const result = updateContributionTracking(2, false);
    expect(result.consecutiveLowDays).toBe(3);
    expect(result.status).toBe('warning');
  });

  it('transitions from active to warning at 3 days', () => {
    // Start at 2 days, miss again → 3 days → warning
    const result = updateContributionTracking(2, false);
    expect(result.status).toBe('warning');
  });

  it('transitions from warning to inactive at 5 days', () => {
    // Start at 4 days, miss again → 5 days → inactive
    const result = updateContributionTracking(4, false);
    expect(result.status).toBe('inactive');
  });

  it('resets from inactive to active when above threshold', () => {
    const result = updateContributionTracking(10, true);
    expect(result.status).toBe('active');
    expect(result.consecutiveLowDays).toBe(0);
  });
});
