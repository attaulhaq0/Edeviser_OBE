export interface CitationValidation {
  valid: boolean;
  markers: number[];
  invalidMarkers: number[];
}

export const extractCitationMarkers = (text: string): number[] => {
  const numbers = new Set<number>();
  for (const match of text.matchAll(/\[(\d+)\]/g)) {
    const value = Number(match[1]);
    if (Number.isInteger(value) && value > 0) numbers.add(value);
  }
  return [...numbers].sort((a, b) => a - b);
};

/**
 * Model output may refer only to the ordered, server-authorized evidence set.
 * Material IDs and filenames are deliberately not accepted from the model.
 */
export const validateCitationMarkers = (
  text: string,
  authorizedCitationCount: number
): CitationValidation => {
  const markers = extractCitationMarkers(text);
  const invalidMarkers = markers.filter(
    (marker) => marker > authorizedCitationCount
  );
  return {
    valid: invalidMarkers.length === 0,
    markers,
    invalidMarkers,
  };
};
