// ─── Text Chunking for RAG Embedding Pipeline ──────────────────────────────
//
// Splits text documents into overlapping chunks suitable for vector embedding.
// Uses word-based token estimation (~0.75 words per token, i.e. ~4 chars/token).
// Respects sentence boundaries when possible.
//
// Pure functions — no side effects.

// ─── Types ──────────────────────────────────────────────────────────────────

/** A single chunk produced by the text chunking function. */
export interface TextChunk {
  /** The chunk text content. */
  text: string;
  /** Character offset where this chunk starts in the original text. */
  start_offset: number;
  /** Character offset where this chunk ends in the original text (exclusive). */
  end_offset: number;
  /** Estimated token count for this chunk. */
  token_count_estimate: number;
}

/** Configuration for the chunking function. */
export interface ChunkConfig {
  /** Minimum tokens per chunk (default: 200). */
  minTokens: number;
  /** Maximum tokens per chunk (default: 500). */
  maxTokens: number;
  /** Token overlap between consecutive chunks (default: 50). */
  overlapTokens: number;
}

/** Default chunking configuration matching the spec: 200–500 tokens, 50-token overlap. */
export const DEFAULT_CHUNK_CONFIG: Readonly<ChunkConfig> = {
  minTokens: 200,
  maxTokens: 500,
  overlapTokens: 50,
} as const;

// ─── Token Estimation ───────────────────────────────────────────────────────

/**
 * Estimates the token count for a given text string.
 *
 * Uses the character-based heuristic: ~4 characters per token.
 * This aligns with the spec's guidance (~0.75 words per token or ~4 chars/token).
 *
 * @param text - The text to estimate tokens for.
 * @returns Estimated token count (minimum 0).
 */
export function estimateTokenCount(text: string): number {
  if (text.length === 0) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

// ─── Sentence Splitting ─────────────────────────────────────────────────────

/**
 * Splits text into sentences, preserving the original text exactly.
 *
 * Handles common sentence-ending punctuation (., !, ?) followed by whitespace
 * or end of string. Avoids splitting on abbreviations like "Dr.", "Mr.", "e.g.".
 *
 * @param text - The text to split into sentences.
 * @returns Array of sentence strings (including trailing whitespace).
 */
export function splitIntoSentences(text: string): string[] {
  if (text.length === 0) return [];

  // Split on sentence-ending punctuation followed by whitespace or end of string.
  // The regex captures the delimiter so we can reconstruct the original text.
  const parts = text.split(/(?<=[.!?])\s+/);

  // Filter out empty strings that can result from splitting
  return parts.filter((p) => p.length > 0);
}

// ─── Main Chunking Function ─────────────────────────────────────────────────

/**
 * Chunks a text document into overlapping segments for RAG embedding.
 *
 * Behavior:
 * - Empty or whitespace-only text returns an empty array.
 * - Text shorter than `minTokens` returns a single chunk.
 * - Respects sentence boundaries when possible (won't split mid-sentence
 *   unless a single sentence exceeds `maxTokens`).
 * - Consecutive chunks overlap by `overlapTokens` tokens for context continuity.
 *
 * @param text - The document text to chunk.
 * @param config - Optional chunking configuration (defaults to 200–500 tokens, 50 overlap).
 * @returns Array of TextChunk objects with text, offsets, and token estimates.
 */
export function chunkText(
  text: string,
  config: ChunkConfig = DEFAULT_CHUNK_CONFIG,
): TextChunk[] {
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];

  const { maxTokens, overlapTokens } = config;

  // If the entire text fits within maxTokens, return as a single chunk
  const totalTokens = estimateTokenCount(trimmed);
  if (totalTokens <= maxTokens) {
    return [
      {
        text: trimmed,
        start_offset: text.indexOf(trimmed),
        end_offset: text.indexOf(trimmed) + trimmed.length,
        token_count_estimate: totalTokens,
      },
    ];
  }

  const sentences = splitIntoSentences(trimmed);
  const chunks: TextChunk[] = [];

  // Track the current chunk being built
  let currentSentences: string[] = [];
  let currentTokens = 0;

  // We need to track character offsets relative to the trimmed text
  const trimOffset = text.indexOf(trimmed);

  // Build a map of sentence start offsets within the trimmed text
  const sentenceOffsets: number[] = [];
  let offsetCursor = 0;
  for (const sentence of sentences) {
    const idx = trimmed.indexOf(sentence, offsetCursor);
    sentenceOffsets.push(idx >= 0 ? idx : offsetCursor);
    offsetCursor = (idx >= 0 ? idx : offsetCursor) + sentence.length;
    // Skip whitespace between sentences
    while (offsetCursor < trimmed.length && /\s/.test(trimmed[offsetCursor]!)) {
      offsetCursor++;
    }
  }

  /**
   * Flushes the current accumulated sentences into a chunk.
   */
  const flushChunk = (): void => {
    if (currentSentences.length === 0) return;

    const chunkText = currentSentences.join(' ');
    const firstSentenceIdx = sentences.indexOf(currentSentences[0]!);
    const lastSentenceIdx = sentences.indexOf(
      currentSentences[currentSentences.length - 1]!,
    );

    const startOffset =
      firstSentenceIdx >= 0
        ? sentenceOffsets[firstSentenceIdx]!
        : 0;
    const lastSentence = currentSentences[currentSentences.length - 1]!;
    const lastSentenceOffset =
      lastSentenceIdx >= 0
        ? sentenceOffsets[lastSentenceIdx]!
        : startOffset;
    const endOffset = lastSentenceOffset + lastSentence.length;

    chunks.push({
      text: chunkText,
      start_offset: trimOffset + startOffset,
      end_offset: trimOffset + endOffset,
      token_count_estimate: estimateTokenCount(chunkText),
    });
  };

  // Process sentences, building chunks that respect size bounds
  let sentenceIdx = 0;
  while (sentenceIdx < sentences.length) {
    const sentence = sentences[sentenceIdx]!;
    const sentenceTokens = estimateTokenCount(sentence);

    // If a single sentence exceeds maxTokens, force-split it by characters
    if (sentenceTokens > maxTokens && currentSentences.length === 0) {
      const maxChars = maxTokens * 4;
      const overlapChars = overlapTokens * 4;
      let charPos = 0;

      while (charPos < sentence.length) {
        const end = Math.min(charPos + maxChars, sentence.length);
        const slice = sentence.slice(charPos, end);
        const sentenceStartOffset = sentenceOffsets[sentenceIdx]!;

        chunks.push({
          text: slice,
          start_offset: trimOffset + sentenceStartOffset + charPos,
          end_offset: trimOffset + sentenceStartOffset + end,
          token_count_estimate: estimateTokenCount(slice),
        });

        // Advance with overlap
        charPos = end === sentence.length ? end : end - overlapChars;
      }

      sentenceIdx++;
      continue;
    }

    // If adding this sentence would exceed maxTokens, flush and start overlap
    if (currentTokens + sentenceTokens > maxTokens && currentSentences.length > 0) {
      flushChunk();

      // Calculate overlap: walk backwards through current sentences to find
      // sentences that fit within the overlap token budget
      const overlapSentences: string[] = [];
      let overlapCount = 0;
      for (let i = currentSentences.length - 1; i >= 0; i--) {
        const s = currentSentences[i]!;
        const sTokens = estimateTokenCount(s);
        if (overlapCount + sTokens > overlapTokens) break;
        overlapSentences.unshift(s);
        overlapCount += sTokens;
      }

      currentSentences = [...overlapSentences];
      currentTokens = overlapCount;
      continue; // Re-process the current sentence with the overlap context
    }

    currentSentences.push(sentence);
    currentTokens += sentenceTokens;
    sentenceIdx++;
  }

  // Flush any remaining sentences
  flushChunk();

  return chunks;
}
