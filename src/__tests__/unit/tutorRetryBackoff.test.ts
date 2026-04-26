// **Validates: Property 34 — Retry delays follow exponential backoff**

import { describe, it, expect } from 'vitest';
import {
  calculateBackoffDelay,
  getRetryDelaySequence,
  INITIAL_DELAY_MS,
  MAX_RETRIES,
} from '@/lib/tutorRetry';

describe('calculateBackoffDelay', () => {
  it('returns 1000ms for attempt 1', () => {
    expect(calculateBackoffDelay(1)).toBe(1000);
  });

  it('returns 2000ms for attempt 2', () => {
    expect(calculateBackoffDelay(2)).toBe(2000);
  });

  it('returns 4000ms for attempt 3', () => {
    expect(calculateBackoffDelay(3)).toBe(4000);
  });

  it('follows the formula: INITIAL_DELAY_MS * 2^(attempt-1)', () => {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const expected = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
      expect(calculateBackoffDelay(attempt)).toBe(expected);
    }
  });

  it('returns -1 for attempt 0 (invalid)', () => {
    expect(calculateBackoffDelay(0)).toBe(-1);
  });

  it('returns -1 for attempt exceeding MAX_RETRIES', () => {
    expect(calculateBackoffDelay(MAX_RETRIES + 1)).toBe(-1);
  });

  it('returns -1 for negative attempt', () => {
    expect(calculateBackoffDelay(-1)).toBe(-1);
  });
});

describe('getRetryDelaySequence', () => {
  it('returns [1000, 2000, 4000] for default config', () => {
    expect(getRetryDelaySequence()).toEqual([1000, 2000, 4000]);
  });

  it('has exactly MAX_RETRIES entries', () => {
    expect(getRetryDelaySequence()).toHaveLength(MAX_RETRIES);
  });

  it('each delay is double the previous', () => {
    const sequence = getRetryDelaySequence();
    for (let i = 1; i < sequence.length; i++) {
      expect(sequence[i]).toBe(sequence[i - 1]! * 2);
    }
  });
});

describe('constants', () => {
  it('INITIAL_DELAY_MS is 1000', () => {
    expect(INITIAL_DELAY_MS).toBe(1000);
  });

  it('MAX_RETRIES is 3', () => {
    expect(MAX_RETRIES).toBe(3);
  });
});
