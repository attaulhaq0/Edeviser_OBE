// Feature: edeviser-platform, Property 45: Offline queue flush integrity
// Feature: edeviser-platform, Property 46: Journal draft auto-save round-trip
// **Validates: Requirements 63.1, 63.3, 63.5**

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { offlineQueue } from '@/lib/offlineQueue';
import { draftManager } from '@/lib/draftManager';

// ─── Property 45: Offline queue flush integrity ─────────────────────────────

describe('Property 45 — Offline queue flush integrity', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('P45a: all enqueued events are flushed successfully when handlers succeed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            handler: fc.constant('test_handler'),
            payload: fc.record({
              event_type: fc.constantFrom('login', 'page_view', 'submission'),
              student_id: fc.uuid(),
              timestamp: fc.integer({ min: 0, max: 364 }).map((offset) => new Date(Date.UTC(2025, 0, 1 + offset)).toISOString()),
            }),
          }),
          { minLength: 0, maxLength: 15 },
        ),
        async (events) => {
          localStorage.clear();
          const flushedPayloads: unknown[] = [];

          offlineQueue.registerHandler('test_handler', async (payload) => {
            flushedPayloads.push(payload);
          });

          // Enqueue all events
          for (const event of events) {
            offlineQueue.enqueue(event.handler, event.payload);
          }

          expect(offlineQueue.size()).toBe(events.length);

          // Flush
          const result = await offlineQueue.flush();

          expect(result.flushed).toBe(events.length);
          expect(result.failed).toBe(0);
          expect(flushedPayloads).toHaveLength(events.length);
          // Queue should be empty after successful flush
          expect(offlineQueue.size()).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P45b: failed events are retried up to max retries, then dead-lettered', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (eventCount) => {
          localStorage.clear();

          // Handler that always fails
          offlineQueue.registerHandler('failing_handler', async () => {
            throw new Error('Network error');
          });

          for (let i = 0; i < eventCount; i++) {
            offlineQueue.enqueue('failing_handler', { id: i });
          }

          // Flush 3 times (max retries = 3)
          await offlineQueue.flush();
          await offlineQueue.flush();
          const finalResult = await offlineQueue.flush();

          // After 3 flush attempts, all events should be dead-lettered
          expect(finalResult.failed).toBe(eventCount);
          expect(offlineQueue.size()).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P45c: enqueue then flush preserves payload data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          student_id: fc.uuid(),
          event_type: fc.string({ minLength: 1, maxLength: 20 }),
          value: fc.integer({ min: 0, max: 10000 }),
        }),
        async (payload) => {
          localStorage.clear();
          let receivedPayload: unknown = null;

          offlineQueue.registerHandler('capture_handler', async (p) => {
            receivedPayload = p;
          });

          offlineQueue.enqueue('capture_handler', payload);
          await offlineQueue.flush();

          expect(receivedPayload).toEqual(payload);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 46: Journal draft auto-save round-trip ────────────────────────

describe('Property 46 — Journal draft auto-save round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('P46a: saveDraft then loadDraft returns identical content', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.oneof(
          fc.string({ minLength: 0, maxLength: 500 }),
          fc.integer(),
          fc.record({
            title: fc.string({ minLength: 0, maxLength: 100 }),
            body: fc.string({ minLength: 0, maxLength: 500 }),
            wordCount: fc.integer({ min: 0, max: 10000 }),
          }),
          fc.array(fc.string({ minLength: 0, maxLength: 50 }), { minLength: 0, maxLength: 10 }),
        ),
        (key, content) => {
          localStorage.clear();
          draftManager.saveDraft(key, content);
          const loaded = draftManager.loadDraft(key);
          expect(loaded).toEqual(content);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P46b: clearDraft removes the draft from storage', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        (key, content) => {
          localStorage.clear();
          draftManager.saveDraft(key, content);
          expect(draftManager.loadDraft(key)).toEqual(content);

          draftManager.clearDraft(key);
          expect(draftManager.loadDraft(key)).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P46c: loadDraft returns null for non-existent keys', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        (key) => {
          localStorage.clear();
          expect(draftManager.loadDraft(key)).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P46d: overwriting a draft with new content returns the latest content', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        (key, content1, content2) => {
          localStorage.clear();
          draftManager.saveDraft(key, content1);
          draftManager.saveDraft(key, content2);
          expect(draftManager.loadDraft(key)).toEqual(content2);
        },
      ),
      { numRuns: 100 },
    );
  });
});
