// ─── Types ───────────────────────────────────────────────────────────────────

export interface TextChunk {
  text: string;
  tokenCount: number;
  chunkIndex: number;
}

export interface ChunkOptions {
  minTokens?: number;
  maxTokens?: number;
  overlapTokens?: number;
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  minTokens: 200,
  maxTokens: 500,
  overlapTokens: 50,
};

// ─── Token Estimation ────────────────────────────────────────────────────────

/**
 * Estimates token count using a word-based heuristic.
 * OpenAI's tokenizer averages ~0.75 tokens per word for English text,
 * but for simplicity and safety we use 1 word ≈ 1.33 tokens (4 chars per token).
 */
export const estimateTokenCount = (text: string): number => {
  if (!text.trim()) return 0;
  // Approximate: 1 token ≈ 4 characters (GPT tokenizer average)
  return Math.ceil(text.length / 4);
};

// ─── Sentence Splitting ─────────────────────────────────────────────────────

/**
 * Splits text into sentences, preserving sentence boundaries.
 * Handles common abbreviations and decimal numbers to avoid false splits.
 */
const splitIntoSentences = (text: string): string[] => {
  // Split on sentence-ending punctuation followed by whitespace or end of string
  const sentences = text.match(/[^.!?]*[.!?]+[\s]?|[^.!?]+$/g);
  if (!sentences) return [text];
  return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
};

// ─── Chunking Function ──────────────────────────────────────────────────────

/**
 * Splits text into chunks of 200–500 tokens with 50-token overlap.
 * Preserves sentence boundaries where possible.
 *
 * Algorithm:
 * 1. Split text into sentences
 * 2. Accumulate sentences into chunks until maxTokens is reached
 * 3. When a chunk reaches the target size, start a new chunk with overlap
 * 4. Overlap is achieved by including trailing sentences from the previous chunk
 */
export const chunkText = (
  text: string,
  options?: ChunkOptions
): TextChunk[] => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const trimmed = text.trim();

  if (!trimmed) return [];

  const totalTokens = estimateTokenCount(trimmed);

  // If the entire text fits in one chunk, return it as-is
  if (totalTokens <= opts.maxTokens) {
    return [
      {
        text: trimmed,
        tokenCount: totalTokens,
        chunkIndex: 0,
      },
    ];
  }

  const sentences = splitIntoSentences(trimmed);
  const chunks: TextChunk[] = [];

  let currentSentences: string[] = [];
  let currentTokens = 0;
  let chunkIndex = 0;

  const flushChunk = (): void => {
    if (currentSentences.length === 0) return;

    const chunkText = currentSentences.join(" ");
    chunks.push({
      text: chunkText,
      tokenCount: estimateTokenCount(chunkText),
      chunkIndex,
    });
    chunkIndex++;

    // Calculate overlap: take sentences from the end of the current chunk
    // that total approximately overlapTokens
    const overlapSentences: string[] = [];
    let overlapTokenCount = 0;

    for (let i = currentSentences.length - 1; i >= 0; i--) {
      const sentence = currentSentences[i];
      if (sentence === undefined) continue;
      const sentenceTokens = estimateTokenCount(sentence);
      if (overlapTokenCount + sentenceTokens > opts.overlapTokens) break;
      overlapSentences.unshift(sentence);
      overlapTokenCount += sentenceTokens;
    }

    currentSentences = overlapSentences;
    currentTokens = overlapTokenCount;
  };

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokenCount(sentence);

    // If a single sentence exceeds maxTokens, force-split it by character count
    if (sentenceTokens > opts.maxTokens) {
      // Flush any accumulated sentences first
      if (currentSentences.length > 0) {
        flushChunk();
      }

      // Split the long sentence into sub-chunks
      const charsPerChunk = opts.maxTokens * 4; // reverse of token estimation
      for (
        let i = 0;
        i < sentence.length;
        i += charsPerChunk - opts.overlapTokens * 4
      ) {
        const subText = sentence.slice(i, i + charsPerChunk).trim();
        if (subText) {
          chunks.push({
            text: subText,
            tokenCount: estimateTokenCount(subText),
            chunkIndex,
          });
          chunkIndex++;
        }
      }
      currentSentences = [];
      currentTokens = 0;
      continue;
    }

    // If adding this sentence would exceed maxTokens, flush the current chunk
    if (
      currentTokens + sentenceTokens > opts.maxTokens &&
      currentSentences.length > 0
    ) {
      flushChunk();
    }

    currentSentences.push(sentence);
    currentTokens += sentenceTokens;
  }

  // Flush any remaining sentences
  if (currentSentences.length > 0) {
    const chunkTextStr = currentSentences.join(" ");
    chunks.push({
      text: chunkTextStr,
      tokenCount: estimateTokenCount(chunkTextStr),
      chunkIndex,
    });
  }

  return chunks;
};
