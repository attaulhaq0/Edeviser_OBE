import type { CurriculumMatrixData } from '@/hooks/useCurriculumMatrix';

/**
 * Escapes a CSV field value, wrapping in double-quotes when the value
 * contains commas, double-quotes, or newlines (RFC 4180).
 */
export function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Builds a CSV string from curriculum matrix data.
 *
 * - First column: PLO title
 * - Subsequent columns: course codes
 * - Cell values: CLO count (number of CLOs mapped)
 */
export function buildMatrixCsv(matrixData: CurriculumMatrixData): string {
  const { plos, courses, matrix } = matrixData;

  const header = ['PLO', ...courses.map((c) => escapeCsvField(c.code))].join(',');

  const rows = plos.map((plo) => {
    const cells = courses.map((course) => {
      const cell = matrix[plo.id]?.[course.id];
      return cell ? String(cell.cloCount) : '0';
    });
    return [escapeCsvField(plo.title), ...cells].join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Triggers a browser download of the given CSV content.
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
