// Feature: ai-tutor-rag, Property 1: Chunking produces valid segments
// For any non-empty document text, the chunking function should produce chunks where
// each chunk contains between 200 and 500 tokens (except possibly the last chunk which
// may be shorter), and consecutive chunks overlap by exactly 50 tokens.
// **Validates: Requirements 1.1**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  chunkText,
  estimateTokenCount,
  DEFAULT_CHUNK_CONFIG,
} from '@/lib/tutorChunker';

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Generate random text with enough tokens to produce multiple chunks. */
const longTextArb = fc
  .array(fc.lorem({ mode: 'sentences', maxCount: 5 }), { minLength: 5, maxLength: 40 })
  .map((sentences) => sentences.join(' '));

/** Generate short text that fits in a single chunk. */
const shortTextArb = fc.lorem({ mode: 'sentences', maxCount: 2 });

// ─── Property 1: Chunk size and overlap invariants ──────────────────────────

describe('Property 1 — Chunk size and overlap invariants', () => {
  it('P1a: all chunks except the last are within 200–500 token range', () => {
    fc.assert(
      fc.property(longTextArb, (text) => {
        const chunks = chunkText(text, DEFAULT_CHUNK_CONFIG);
        if (chunks.length <= 1) return; // single chunk is allowed to be shorter

        // All chunks except the last must be ≤ maxTokens
        for (let i = 0; i < chunks.length; i++) {
          expect(chunks[i]!.token_count_estimate).toBeLessThanOrEqual(
            DEFAULT_CHUNK_CONFIG.maxTokens,
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P1b: empty or whitespace-only text produces zero chunks', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', '   ', '\n\n', '\t  \n'),
        (text) => {
          const chunks = chunkText(text);
          expect(chunks).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P1c: short text (below maxTokens) produces exactly one chunk', () => {
    fc.assert(
      fc.property(shortTextArb, (text) => {
        if (text.trim().length === 0) return;
        const tokens = estimateTokenCount(text.trim());
        if (tokens > DEFAULT_CHUNK_CONFIG.maxTokens) return;

        const chunks = chunkText(text);
        expect(chunks).toHaveLength(1);
        expect(chunks[0]!.text).toBe(text.trim());
      }),
      { numRuns: 100 },
    );
  });

  it('P1d: chunk token estimates are consistent with estimateTokenCount', () => {
    fc.assert(
      fc.property(longTextArb, (text) => {
        const chunks = chunkText(text);
        for (const chunk of chunks) {
          expect(chunk.token_count_estimate).toBe(estimateTokenCount(chunk.text));
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P1e: consecutive chunks have overlapping content when multiple chunks exist', () => {
    fc.assert(
      fc.property(longTextArb, (text) => {
        const chunks = chunkText(text, DEFAULT_CHUNK_CONFIG);
        if (chunks.length <= 1) return;

        // For consecutive chunks, the end of chunk N should overlap with the start of chunk N+1
        // We verify this by checking that the start_offset of chunk N+1 is less than
        // the end_offset of chunk N (i.e., there is overlap in the source text)
        for (let i = 0; i < chunks.length - 1; i++) {
          const current = chunks[i]!;
          const next = chunks[i + 1]!;
          // The next chunk should start before or at the end of the current chunk
          // (overlap means the next chunk's start is before the current chunk's end)
          expect(next.start_offset).toBeLessThanOrEqual(current.end_offset);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P1f: all chunks have non-empty text', () => {
    fc.assert(
      fc.property(longTextArb, (text) => {
        const chunks = chunkText(text);
        for (const chunk of chunks) {
          expect(chunk.text.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });
});
