// Feature: ai-tutor-rag, Property 20: Text input validation (1-2000 chars)
// Feature: ai-tutor-rag, Property 21: File attachment validation (max 2 images, 5MB each; max 1 doc, 10MB)
// **Validates: Requirements 11.1, 11.2, 12.1**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { sendMessageSchema } from '@/lib/tutorSchemas';

// ─── Property 20: Text input validation enforces character limit ────────────

describe('Property 20 — Text input validation (1–2000 chars)', () => {
  it('P20a: valid messages (1–2000 chars) are accepted', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 2000 }).filter((s) => s.trim().length > 0),
        (message) => {
          const result = sendMessageSchema.safeParse({ message });
          expect(result.success).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P20b: empty messages are rejected', () => {
    const result = sendMessageSchema.safeParse({ message: '' });
    expect(result.success).toBe(false);
  });

  it('P20c: messages exceeding 2000 chars are rejected', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2001, maxLength: 5000 }),
        (message) => {
          const result = sendMessageSchema.safeParse({ message });
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P20d: exactly 2000 char messages are accepted', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9 ]{2000}$/),
        (message) => {
          const result = sendMessageSchema.safeParse({ message });
          expect(result.success).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 21: File attachment validation ────────────────────────────────

describe('Property 21 — File attachment validation', () => {
  const validUrl = 'https://storage.example.com/file.jpg';

  it('P21a: up to 2 image URLs are accepted', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 }),
        (count) => {
          const imageUrls = Array.from({ length: count }, (_, i) =>
            `https://storage.example.com/image${i}.jpg`,
          );
          const result = sendMessageSchema.safeParse({
            message: 'Help me understand this',
            image_urls: imageUrls,
          });
          expect(result.success).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P21b: more than 2 image URLs are rejected', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 10 }),
        (count) => {
          const imageUrls = Array.from({ length: count }, (_, i) =>
            `https://storage.example.com/image${i}.jpg`,
          );
          const result = sendMessageSchema.safeParse({
            message: 'Help me understand this',
            image_urls: imageUrls,
          });
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P21c: a single document URL is accepted', () => {
    const result = sendMessageSchema.safeParse({
      message: 'Analyze this document',
      document_url: validUrl,
    });
    expect(result.success).toBe(true);
  });

  it('P21d: invalid image URLs are rejected', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z]{3,20}$/),
        (badUrl) => {
          const result = sendMessageSchema.safeParse({
            message: 'Help me',
            image_urls: [badUrl],
          });
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P21e: invalid document URLs are rejected', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z]{3,20}$/),
        (badUrl) => {
          const result = sendMessageSchema.safeParse({
            message: 'Analyze this',
            document_url: badUrl,
          });
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
