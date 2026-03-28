// =============================================================================
// OfflineQueue — Unit tests
// Feature: edeviser-platform, Task 54.2
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { offlineQueue } from '@/lib/offlineQueue';

describe('offlineQueue', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('enqueue', () => {
    it('adds an event to the queue', () => {
      offlineQueue.enqueue('test_handler', { foo: 'bar' });
      expect(offlineQueue.size()).toBe(1);
    });

    it('adds multiple events', () => {
      offlineQueue.enqueue('h1', { a: 1 });
      offlineQueue.enqueue('h2', { b: 2 });
      expect(offlineQueue.size()).toBe(2);
    });
  });

  describe('flush', () => {
    it('flushes all events with registered handlers', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      offlineQueue.registerHandler('my_handler', handler);

      offlineQueue.enqueue('my_handler', { data: 'test' });
      offlineQueue.enqueue('my_handler', { data: 'test2' });

      const result = await offlineQueue.flush();
      expect(result.flushed).toBe(2);
      expect(result.failed).toBe(0);
      expect(handler).toHaveBeenCalledTimes(2);
      expect(offlineQueue.size()).toBe(0);
    });

    it('retries failed events up to 3 times', async () => {
      const handler = vi.fn().mockImplementation(async () => {
        throw new Error('network error');
      });
      offlineQueue.registerHandler('fail_handler', handler);

      offlineQueue.enqueue('fail_handler', { data: 'x' });

      // First flush — retry 1
      await offlineQueue.flush();
      expect(offlineQueue.size()).toBe(1);

      // Second flush — retry 2
      await offlineQueue.flush();
      expect(offlineQueue.size()).toBe(1);

      // Third flush — retry 3, should be dead-lettered
      const result = await offlineQueue.flush();
      expect(result.failed).toBe(1);
      expect(offlineQueue.size()).toBe(0);
    });

    it('keeps events with no registered handler', async () => {
      offlineQueue.enqueue('unknown_handler', { data: 'x' });
      const result = await offlineQueue.flush();
      expect(result.failed).toBe(1);
      expect(offlineQueue.size()).toBe(1);
    });

    it('returns zero counts for empty queue', async () => {
      const result = await offlineQueue.flush();
      expect(result.flushed).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('init', () => {
    it('registers online event listener and returns cleanup', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');

      const cleanup = offlineQueue.init();
      expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function));

      cleanup();
      expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
    });
  });

  describe('size', () => {
    it('returns 0 for empty queue', () => {
      expect(offlineQueue.size()).toBe(0);
    });

    it('returns correct count after enqueue', () => {
      offlineQueue.enqueue('h', { a: 1 });
      offlineQueue.enqueue('h', { b: 2 });
      offlineQueue.enqueue('h', { c: 3 });
      expect(offlineQueue.size()).toBe(3);
    });
  });
});
