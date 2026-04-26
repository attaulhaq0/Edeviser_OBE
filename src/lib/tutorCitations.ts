// ─── Citation Parsing Utilities ──────────────────────────────────────────────
//
// Extracts citation markers like [1], [2] from LLM response text.
// Used by ChatMessage component to render clickable citation badges.

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CitationMarker {
  /** The citation number (1-based). */
  index: number;
  /** Character position where the marker starts in the text. */
  start: number;
  /** Character position where the marker ends in the text (exclusive). */
  end: number;
}

// ─── Citation Extraction ────────────────────────────────────────────────────

/**
 * Extracts citation markers (e.g., [1], [2]) from LLM response text.
 *
 * @param text - The assistant response text to parse.
 * @returns Array of CitationMarker objects, sorted by position.
 */
export function extractCitationMarkers(text: string): CitationMarker[] {
  const markers: CitationMarker[] = [];
  const regex = /\[(\d+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const index = parseInt(match[1]!, 10);
    if (index > 0) {
      markers.push({
        index,
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  return markers;
}

/**
 * Returns the unique citation indices found in the text, sorted ascending.
 *
 * @param text - The assistant response text to parse.
 * @returns Array of unique citation numbers.
 */
export function getUniqueCitationIndices(text: string): number[] {
  const markers = extractCitationMarkers(text);
  const unique = [...new Set(markers.map((m) => m.index))];
  return unique.sort((a, b) => a - b);
}
