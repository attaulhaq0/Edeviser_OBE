import { describe, it, expect } from 'vitest';

// ─── Replicate pure helpers from the Edge Function for unit testing ──────────
// Edge Functions run on Deno and can't be imported directly in Vitest.
// We test the core logic by replicating the pure functions here.

const BLOOMS_ORDER: Record<string, number> = {
  remembering: 0,
  understanding: 1,
  applying: 2,
  analyzing: 3,
  evaluating: 4,
  creating: 5,
};

interface PrerequisiteCLO {
  id: string;
  title: string;
  blooms_level: string | null;
}

function buildSuggestionText(
  weakTitle: string,
  weakBlooms: string | null,
  weakAttainment: number,
  prereq: PrerequisiteCLO | null,
): string {
  const bloomsLabel = weakBlooms
    ? weakBlooms.charAt(0).toUpperCase() + weakBlooms.slice(1)
    : 'Unknown';

  if (prereq && prereq.blooms_level) {
    const prereqBlooms = prereq.blooms_level.charAt(0).toUpperCase() + prereq.blooms_level.slice(1);
    return (
      `Before you tackle "${weakTitle}" (${bloomsLabel}), strengthen your ` +
      `"${prereq.title}" (${prereqBlooms}) skills — your attainment is at ${weakAttainment}%.`
    );
  }

  return (
    `Focus on improving "${weakTitle}" (${bloomsLabel}) — your current attainment ` +
    `is ${weakAttainment}%, which is below the 70% target.`
  );
}

describe('ai-module-suggestion helpers', () => {
  describe('BLOOMS_ORDER', () => {
    it('should have 6 levels in ascending order', () => {
      expect(Object.keys(BLOOMS_ORDER)).toHaveLength(6);
      expect(BLOOMS_ORDER['remembering']).toBe(0);
      expect(BLOOMS_ORDER['creating']).toBe(5);
    });

    it('should maintain correct ordering', () => {
      const levels = ['remembering', 'understanding', 'applying', 'analyzing', 'evaluating', 'creating'];
      for (let i = 0; i < levels.length - 1; i++) {
        expect(BLOOMS_ORDER[levels[i]]).toBeLessThan(BLOOMS_ORDER[levels[i + 1]]);
      }
    });
  });

  describe('buildSuggestionText', () => {
    it('should generate text with prerequisite when prereq is provided', () => {
      const result = buildSuggestionText(
        'Analyze Data Structures',
        'analyzing',
        55,
        { id: 'prereq-1', title: 'Apply Algorithms', blooms_level: 'applying' },
      );

      expect(result).toContain('Before you tackle');
      expect(result).toContain('"Analyze Data Structures"');
      expect(result).toContain('Analyzing');
      expect(result).toContain('"Apply Algorithms"');
      expect(result).toContain('Applying');
      expect(result).toContain('55%');
    });

    it('should generate fallback text when no prerequisite exists', () => {
      const result = buildSuggestionText('Recall Definitions', 'remembering', 40, null);

      expect(result).toContain('Focus on improving');
      expect(result).toContain('"Recall Definitions"');
      expect(result).toContain('Remembering');
      expect(result).toContain('40%');
      expect(result).toContain('below the 70% target');
    });

    it('should handle null blooms level gracefully', () => {
      const result = buildSuggestionText('Some CLO', null, 60, null);

      expect(result).toContain('Unknown');
      expect(result).toContain('60%');
    });

    it('should generate fallback text when prereq has no blooms level', () => {
      const result = buildSuggestionText(
        'Evaluate Results',
        'evaluating',
        45,
        { id: 'prereq-2', title: 'Some CLO', blooms_level: null },
      );

      expect(result).toContain('Focus on improving');
      expect(result).not.toContain('Before you tackle');
    });

    it('should include attainment percentage in all cases', () => {
      const withPrereq = buildSuggestionText(
        'CLO A', 'analyzing', 30,
        { id: '1', title: 'CLO B', blooms_level: 'applying' },
      );
      const withoutPrereq = buildSuggestionText('CLO C', 'creating', 65, null);

      expect(withPrereq).toContain('30%');
      expect(withoutPrereq).toContain('65%');
    });
  });
});
