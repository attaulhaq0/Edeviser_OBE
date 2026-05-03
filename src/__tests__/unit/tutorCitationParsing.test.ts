// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { extractCitationMarkers } from '@/lib/tutorCitationParser';

describe('extractCitationMarkers', () => {
  it('returns empty array for text with no citations', () => {
    expect(extractCitationMarkers('This is a plain response with no references.')).toEqual([]);
  });

  it('extracts a single citation marker', () => {
    expect(extractCitationMarkers('Arrays are stored contiguously [1].')).toEqual([1]);
  });

  it('extracts multiple citation markers', () => {
    const text = 'As explained in [1], linked lists [2] differ from arrays [3].';
    expect(extractCitationMarkers(text)).toEqual([1, 2, 3]);
  });

  it('deduplicates repeated citation numbers', () => {
    const text = 'See [1] for details. Also referenced in [1] and [2].';
    expect(extractCitationMarkers(text)).toEqual([1, 2]);
  });

  it('returns sorted citation numbers', () => {
    const text = 'Check [3] first, then [1], and finally [2].';
    expect(extractCitationMarkers(text)).toEqual([1, 2, 3]);
  });

  it('handles citations embedded in markdown bold', () => {
    const text = '**Important concept** [1] is explained in the **lecture notes** [2].';
    expect(extractCitationMarkers(text)).toEqual([1, 2]);
  });

  it('handles citations embedded in markdown lists', () => {
    const text = [
      '- Point one [1]',
      '- Point two [2]',
      '- Point three [3]',
    ].join('\n');
    expect(extractCitationMarkers(text)).toEqual([1, 2, 3]);
  });

  it('handles citations in code blocks', () => {
    const text = '```\nconst x = arr[1];\n```\nSee [2] for more.';
    // [1] inside code block is still matched as a citation marker
    expect(extractCitationMarkers(text)).toEqual([1, 2]);
  });

  it('handles citations at the start and end of text', () => {
    const text = '[1] This starts with a citation and ends with one [2]';
    expect(extractCitationMarkers(text)).toEqual([1, 2]);
  });

  it('handles double-digit citation numbers', () => {
    const text = 'References [10] and [11] are from the appendix.';
    expect(extractCitationMarkers(text)).toEqual([10, 11]);
  });

  it('returns empty array for empty string', () => {
    expect(extractCitationMarkers('')).toEqual([]);
  });

  it('returns empty array for whitespace-only string', () => {
    expect(extractCitationMarkers('   \n\t  ')).toEqual([]);
  });

  it('ignores [0] as a citation marker', () => {
    const text = 'Index [0] is not a valid citation, but [1] is.';
    expect(extractCitationMarkers(text)).toEqual([1]);
  });

  it('handles adjacent citations without spaces', () => {
    const text = 'Multiple sources[1][2][3] confirm this.';
    expect(extractCitationMarkers(text)).toEqual([1, 2, 3]);
  });
});
