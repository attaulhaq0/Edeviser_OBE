/**
 * Extracts citation marker numbers from response text.
 *
 * Citation markers follow the pattern [1], [2], [3], etc.
 * This is the same regex pattern used in ChatMessage.tsx for rendering.
 *
 * @param text - The assistant response text potentially containing citation markers
 * @returns An array of unique citation numbers (1-indexed), sorted ascending
 */
export const extractCitationMarkers = (text: string): number[] => {
  const matches = text.match(/\[(\d+)\]/g);
  if (!matches) return [];

  const numbers = new Set<number>();
  for (const match of matches) {
    const num = parseInt(match.slice(1, -1), 10);
    if (!isNaN(num) && num > 0) {
      numbers.add(num);
    }
  }

  return Array.from(numbers).sort((a, b) => a - b);
};
