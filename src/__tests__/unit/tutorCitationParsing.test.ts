import { describe, it, expect } from 'vitest';
import {
  extractCitationMarkers,
  getUniqueCitationIndices,
} from '@/lib/tutorCitations';

describe('extractCitationMarkers', () => {
  it('extracts single citation marker', () => {
    const markers = extractCitationMarkers('This is explained in [1] the lecture notes.');
    expect(markers).toHaveLength(1);
    expect(markers[0]!.index).toBe(1);
  });

  it('extracts multiple citation markers', () => {
    const markers = extractCitationMarkers(
      'According to [1] and [2], the algorithm runs in O(n log n) [3].',
    );
    expect(markers).toHaveLength(3);
    expect(markers[0]!.index).toBe(1);
    expect(markers[1]!.index).toBe(2);
    expect(markers[2]!.index).toBe(3);
  });

  it('returns empty array for text without citations', () => {
    const markers = extractCitationMarkers('No citations here.');
    expect(markers).toHaveLength(0);
  });

  it('returns empty array for empty text', () => {
    const markers = extractCitationMarkers('');
    expect(markers).toHaveLength(0);
  });

  it('ignores [0] markers (citations are 1-based)', () => {
    const markers = extractCitationMarkers('This [0] is not a valid citation.');
    expect(markers).toHaveLength(0);
  });

  it('handles duplicate citation markers', () => {
    const markers = extractCitationMarkers('See [1] and also [1] again.');
    expect(markers).toHaveLength(2);
    expect(markers[0]!.index).toBe(1);
    expect(markers[1]!.index).toBe(1);
  });

  it('captures correct start and end positions', () => {
    const text = 'Hello [1] world';
    const markers = extractCitationMarkers(text);
    expect(markers).toHaveLength(1);
    expect(markers[0]!.start).toBe(6);
    expect(markers[0]!.end).toBe(9);
    expect(text.slice(markers[0]!.start, markers[0]!.end)).toBe('[1]');
  });

  it('handles multi-digit citation numbers', () => {
    const markers = extractCitationMarkers('See [10] and [25].');
    expect(markers).toHaveLength(2);
    expect(markers[0]!.index).toBe(10);
    expect(markers[1]!.index).toBe(25);
  });
});

describe('getUniqueCitationIndices', () => {
  it('returns unique sorted indices', () => {
    const indices = getUniqueCitationIndices('See [3], [1], [2], and [1] again.');
    expect(indices).toEqual([1, 2, 3]);
  });

  it('returns empty array for text without citations', () => {
    const indices = getUniqueCitationIndices('No citations.');
    expect(indices).toEqual([]);
  });

  it('deduplicates repeated citations', () => {
    const indices = getUniqueCitationIndices('[1] [1] [1]');
    expect(indices).toEqual([1]);
  });
});
