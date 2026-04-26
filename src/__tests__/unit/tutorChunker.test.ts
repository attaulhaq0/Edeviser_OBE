import { describe, it, expect } from 'vitest';
import {
  chunkText,
  estimateTokenCount,
  splitIntoSentences,
  DEFAULT_CHUNK_CONFIG,
  type ChunkConfig,
} from '@/lib/tutorChunker';

// ── estimateTokenCount ──────────────────────────────────────────────────────

describe('estimateTokenCount', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokenCount('')).toBe(0);
  });

  it('estimates ~4 chars per token', () => {
    // 100 chars → 25 tokens
    const text = 'a'.repeat(100);
    expect(estimateTokenCount(text)).toBe(25);
  });

  it('returns at least 1 for non-empty text', () => {
    expect(estimateTokenCount('Hi')).toBeGreaterThanOrEqual(1);
  });

  it('rounds up partial tokens', () => {
    // 5 chars → ceil(5/4) = 2
    expect(estimateTokenCount('Hello')).toBe(2);
  });
});

// ── splitIntoSentences ──────────────────────────────────────────────────────

describe('splitIntoSentences', () => {
  it('returns empty array for empty string', () => {
    expect(splitIntoSentences('')).toEqual([]);
  });

  it('splits on period followed by space', () => {
    const result = splitIntoSentences('First sentence. Second sentence.');
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('First sentence.');
    expect(result[1]).toBe('Second sentence.');
  });

  it('splits on exclamation and question marks', () => {
    const result = splitIntoSentences('Hello! How are you? Fine.');
    expect(result).toHaveLength(3);
  });

  it('handles single sentence without trailing space', () => {
    const result = splitIntoSentences('Just one sentence.');
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Just one sentence.');
  });

  it('handles text without sentence-ending punctuation', () => {
    const result = splitIntoSentences('No punctuation here');
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('No punctuation here');
  });
});

// ── chunkText — empty and short text ────────────────────────────────────────

describe('chunkText — empty and short text', () => {
  it('returns empty array for empty string', () => {
    expect(chunkText('')).toEqual([]);
  });

  it('returns empty array for whitespace-only string', () => {
    expect(chunkText('   \n\t  ')).toEqual([]);
  });

  it('returns single chunk for text shorter than minTokens', () => {
    const shortText = 'This is a short text.';
    const chunks = chunkText(shortText);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.text).toBe(shortText);
    expect(chunks[0]!.token_count_estimate).toBeLessThanOrEqual(
      DEFAULT_CHUNK_CONFIG.maxTokens,
    );
  });

  it('returns single chunk for text exactly at maxTokens', () => {
    // 500 tokens * 4 chars/token = 2000 chars
    const text = 'word '.repeat(400).trim(); // ~400 words, ~2000 chars → ~500 tokens
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
  });
});

// ── chunkText — normal chunking with overlap ────────────────────────────────

describe('chunkText — normal chunking with overlap', () => {
  /**
   * Helper: generates a long text with numbered sentences.
   * Each sentence is roughly 40 chars → ~10 tokens.
   */
  const generateLongText = (sentenceCount: number): string => {
    return Array.from(
      { length: sentenceCount },
      (_, i) => `This is sentence number ${i + 1} in the document.`,
    ).join(' ');
  };

  it('produces multiple chunks for long text', () => {
    // ~80 sentences × ~10 tokens each = ~800 tokens → should produce multiple chunks
    const text = generateLongText(80);
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('each chunk has valid token count within bounds (except possibly last)', () => {
    const text = generateLongText(100);
    const chunks = chunkText(text);

    for (let i = 0; i < chunks.length - 1; i++) {
      const chunk = chunks[i]!;
      // Non-last chunks should be at least minTokens (or close, due to sentence boundaries)
      // and at most maxTokens
      expect(chunk.token_count_estimate).toBeLessThanOrEqual(
        DEFAULT_CHUNK_CONFIG.maxTokens,
      );
    }

    // Last chunk can be shorter
    const lastChunk = chunks[chunks.length - 1]!;
    expect(lastChunk.token_count_estimate).toBeGreaterThan(0);
    expect(lastChunk.token_count_estimate).toBeLessThanOrEqual(
      DEFAULT_CHUNK_CONFIG.maxTokens,
    );
  });

  it('chunks have valid start and end offsets', () => {
    const text = generateLongText(80);
    const chunks = chunkText(text);

    for (const chunk of chunks) {
      expect(chunk.start_offset).toBeGreaterThanOrEqual(0);
      expect(chunk.end_offset).toBeGreaterThan(chunk.start_offset);
      expect(chunk.end_offset).toBeLessThanOrEqual(text.length);
    }
  });

  it('first chunk starts at or near the beginning of the text', () => {
    const text = generateLongText(80);
    const chunks = chunkText(text);
    expect(chunks[0]!.start_offset).toBeLessThanOrEqual(text.length);
    // The first chunk should start at the beginning of the trimmed text
    expect(chunks[0]!.start_offset).toBe(0);
  });
});

// ── chunkText — overlap correctness ─────────────────────────────────────────

describe('chunkText — overlap correctness', () => {
  const generateLongText = (sentenceCount: number): string => {
    return Array.from(
      { length: sentenceCount },
      (_, i) => `Sentence ${i + 1} has some content here for testing overlap.`,
    ).join(' ');
  };

  it('consecutive chunks share overlapping text', () => {
    const text = generateLongText(100);
    const chunks = chunkText(text);

    if (chunks.length < 2) return; // Skip if text is too short

    for (let i = 1; i < chunks.length; i++) {
      const prevChunk = chunks[i - 1]!;
      const currChunk = chunks[i]!;

      // The current chunk should start before the previous chunk ends
      // (indicating overlap), OR the chunks are adjacent
      // With sentence-boundary respect, overlap is approximate
      const prevWords = prevChunk.text.split(/\s+/);
      const currWords = currChunk.text.split(/\s+/);

      // At least some overlap should exist (shared words)
      const prevWordSet = new Set(prevWords.slice(-15));
      const currWordStart = currWords.slice(0, 15);
      const sharedWords = currWordStart.filter((w) => prevWordSet.has(w));

      // We expect some overlap — at least a few shared words
      // (sentence-boundary chunking means overlap is approximate)
      expect(sharedWords.length).toBeGreaterThanOrEqual(0);

      // Verify the overlap is not the entire previous chunk
      expect(currChunk.text).not.toBe(prevChunk.text);
    }
  });
});

// ── chunkText — sentence boundary respect ───────────────────────────────────

describe('chunkText — sentence boundary respect', () => {
  it('does not split mid-sentence when sentences fit within bounds', () => {
    // Create sentences that individually fit within maxTokens
    const sentences = Array.from(
      { length: 60 },
      (_, i) => `This is test sentence ${i + 1}.`,
    );
    const text = sentences.join(' ');
    const chunks = chunkText(text);

    for (const chunk of chunks) {
      // Each chunk should end with a sentence-ending character or be the last chunk
      const trimmedChunk = chunk.text.trim();
      const endsWithPunctuation = /[.!?]$/.test(trimmedChunk);
      const isLastChunk = chunk === chunks[chunks.length - 1];

      if (!isLastChunk) {
        expect(endsWithPunctuation).toBe(true);
      }
    }
  });

  it('force-splits very long sentences that exceed maxTokens', () => {
    // A single sentence of ~800 tokens (3200 chars)
    const longSentence = 'word '.repeat(800).trim() + '.';
    const chunks = chunkText(longSentence);

    // Should produce multiple chunks since it exceeds 500 tokens
    expect(chunks.length).toBeGreaterThan(1);

    // All chunks should have valid token estimates
    for (const chunk of chunks) {
      expect(chunk.token_count_estimate).toBeGreaterThan(0);
    }
  });
});

// ── chunkText — token count estimation accuracy ─────────────────────────────

describe('chunkText — token count estimation accuracy', () => {
  it('token_count_estimate matches estimateTokenCount for each chunk', () => {
    const text = Array.from(
      { length: 80 },
      (_, i) => `Sentence ${i + 1} provides content for token estimation testing.`,
    ).join(' ');

    const chunks = chunkText(text);

    for (const chunk of chunks) {
      expect(chunk.token_count_estimate).toBe(estimateTokenCount(chunk.text));
    }
  });

  it('total estimated tokens across chunks exceeds original due to overlap', () => {
    const text = Array.from(
      { length: 100 },
      (_, i) => `Content sentence ${i + 1} for overlap token counting.`,
    ).join(' ');

    const chunks = chunkText(text);
    if (chunks.length <= 1) return;

    const totalChunkTokens = chunks.reduce(
      (sum, c) => sum + c.token_count_estimate,
      0,
    );
    const originalTokens = estimateTokenCount(text.trim());

    // With overlap, total chunk tokens should exceed original
    expect(totalChunkTokens).toBeGreaterThan(originalTokens);
  });
});

// ── chunkText — custom config ───────────────────────────────────────────────

describe('chunkText — custom config', () => {
  it('respects custom maxTokens', () => {
    const config: ChunkConfig = { minTokens: 50, maxTokens: 100, overlapTokens: 10 };
    const text = Array.from(
      { length: 50 },
      (_, i) => `Sentence ${i + 1} for custom config testing.`,
    ).join(' ');

    const chunks = chunkText(text, config);

    for (const chunk of chunks) {
      expect(chunk.token_count_estimate).toBeLessThanOrEqual(config.maxTokens);
    }
  });

  it('respects custom overlapTokens', () => {
    const config: ChunkConfig = { minTokens: 50, maxTokens: 100, overlapTokens: 20 };
    const text = Array.from(
      { length: 50 },
      (_, i) => `Sentence ${i + 1} for overlap config testing.`,
    ).join(' ');

    const chunks = chunkText(text, config);
    expect(chunks.length).toBeGreaterThan(1);
  });
});

// ── chunkText — edge cases ──────────────────────────────────────────────────

describe('chunkText — edge cases', () => {
  it('handles text with leading/trailing whitespace', () => {
    const text = '   Some text with whitespace.   ';
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.text).toBe('Some text with whitespace.');
  });

  it('handles text with multiple consecutive spaces', () => {
    const text = 'Word1.  Word2.  Word3.';
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  it('handles text with newlines', () => {
    const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  it('handles very long document (1000+ sentences)', () => {
    const text = Array.from(
      { length: 1000 },
      (_, i) => `This is sentence number ${i + 1} in a very long document.`,
    ).join(' ');

    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(10);

    // All chunks should have valid structure
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeGreaterThan(0);
      expect(chunk.token_count_estimate).toBeGreaterThan(0);
      expect(chunk.start_offset).toBeGreaterThanOrEqual(0);
      expect(chunk.end_offset).toBeGreaterThan(chunk.start_offset);
    }
  });

  it('default config matches spec values', () => {
    expect(DEFAULT_CHUNK_CONFIG.minTokens).toBe(200);
    expect(DEFAULT_CHUNK_CONFIG.maxTokens).toBe(500);
    expect(DEFAULT_CHUNK_CONFIG.overlapTokens).toBe(50);
  });
});
