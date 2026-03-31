// =============================================================================
// Data Export (toCsv utility) — Unit tests
// Validates: Requirement 63 (GDPR Student Data Export)
// =============================================================================

import { describe, it, expect } from 'vitest';

// The toCsv function is embedded in the Deno edge function and not directly
// importable. We replicate the exact logic here for unit testing.

/** Convert an array of objects to CSV string — mirrors export-student-data/index.ts */
function toCsv(rows: Record<string, unknown>[], section: string): string {
  if (rows.length === 0) return '';
  const keys = Object.keys(rows[0]!);
  const header = keys.join(',');
  const lines = rows.map((row) =>
    keys
      .map((k) => {
        const val = row[k];
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(','),
  );
  return `--- ${section} ---\n${header}\n${lines.join('\n')}`;
}

describe('toCsv (data export utility)', () => {
  it('returns empty string for empty rows', () => {
    expect(toCsv([], 'Test')).toBe('');
  });

  it('generates CSV with section header', () => {
    const rows = [{ name: 'Alice', score: 95 }];
    const result = toCsv(rows, 'Grades');
    expect(result).toContain('--- Grades ---');
    expect(result).toContain('name,score');
    expect(result).toContain('Alice,95');
  });

  it('handles multiple rows', () => {
    const rows = [
      { id: '1', value: 'a' },
      { id: '2', value: 'b' },
    ];
    const result = toCsv(rows, 'Data');
    const lines = result.split('\n');
    expect(lines).toHaveLength(4); // section header + header + 2 data rows
    expect(lines[2]).toBe('1,a');
    expect(lines[3]).toBe('2,b');
  });

  it('escapes values containing commas', () => {
    const rows = [{ name: 'Doe, John', age: 25 }];
    const result = toCsv(rows, 'Profile');
    expect(result).toContain('"Doe, John"');
  });

  it('escapes values containing double quotes', () => {
    const rows = [{ feedback: 'Said "great work"' }];
    const result = toCsv(rows, 'Feedback');
    expect(result).toContain('"Said ""great work"""');
  });

  it('escapes values containing newlines', () => {
    const rows = [{ comment: 'Line 1\nLine 2' }];
    const result = toCsv(rows, 'Comments');
    expect(result).toContain('"Line 1\nLine 2"');
  });

  it('handles null and undefined values as empty strings', () => {
    const rows = [{ a: null, b: undefined, c: 'ok' }];
    const result = toCsv(rows, 'Mixed');
    expect(result).toContain(',,ok');
  });

  it('converts non-string values to strings', () => {
    const rows = [{ count: 42, active: true, ratio: 0.75 }];
    const result = toCsv(rows, 'Numbers');
    expect(result).toContain('42,true,0.75');
  });

  it('uses keys from first row as header', () => {
    const rows = [
      { student_id: 's1', xp_amount: 50, created_at: '2024-01-01' },
    ];
    const result = toCsv(rows, 'XP');
    const headerLine = result.split('\n')[1];
    expect(headerLine).toBe('student_id,xp_amount,created_at');
  });
});
