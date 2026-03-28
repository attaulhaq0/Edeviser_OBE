// @vitest-environment happy-dom
// =============================================================================
// DraftManager — Unit tests
// Feature: edeviser-platform, Task 54.1
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { draftManager } from '@/lib/draftManager';

describe('draftManager', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('saveDraft / loadDraft', () => {
    it('saves and loads a string draft', () => {
      draftManager.saveDraft('test-key', 'hello world');
      expect(draftManager.loadDraft<string>('test-key')).toBe('hello world');
    });

    it('saves and loads an object draft', () => {
      const data = { content: 'my journal', courseId: 'c1' };
      draftManager.saveDraft('journal-1', data);
      expect(draftManager.loadDraft('journal-1')).toEqual(data);
    });

    it('returns null for non-existent key', () => {
      expect(draftManager.loadDraft('missing')).toBeNull();
    });

    it('overwrites existing draft', () => {
      draftManager.saveDraft('k', 'v1');
      draftManager.saveDraft('k', 'v2');
      expect(draftManager.loadDraft('k')).toBe('v2');
    });

    it('handles localStorage quota exceeded gracefully', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });
      // Should not throw
      expect(() => draftManager.saveDraft('k', 'v')).not.toThrow();
      setItemSpy.mockRestore();
    });

    it('returns null when localStorage getItem throws', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      expect(draftManager.loadDraft('k')).toBeNull();
      getItemSpy.mockRestore();
    });
  });

  describe('clearDraft', () => {
    it('removes a saved draft', () => {
      draftManager.saveDraft('k', 'v');
      draftManager.clearDraft('k');
      expect(draftManager.loadDraft('k')).toBeNull();
    });

    it('does not throw for non-existent key', () => {
      expect(() => draftManager.clearDraft('missing')).not.toThrow();
    });
  });

  describe('startAutoSave', () => {
    it('auto-saves at the specified interval', () => {
      let counter = 0;
      const getContent = () => `draft-${++counter}`;
      const stop = draftManager.startAutoSave('auto-key', getContent, 30_000);

      // Nothing saved yet
      expect(draftManager.loadDraft('auto-key')).toBeNull();

      // Advance 30s
      vi.advanceTimersByTime(30_000);
      expect(draftManager.loadDraft('auto-key')).toBe('draft-1');

      // Advance another 30s
      vi.advanceTimersByTime(30_000);
      expect(draftManager.loadDraft('auto-key')).toBe('draft-2');

      stop();
    });

    it('stops auto-saving when cleanup is called', () => {
      let counter = 0;
      const stop = draftManager.startAutoSave('auto-key', () => `v-${++counter}`, 10_000);

      vi.advanceTimersByTime(10_000);
      expect(draftManager.loadDraft('auto-key')).toBe('v-1');

      stop();

      vi.advanceTimersByTime(10_000);
      // Should still be v-1 since we stopped
      expect(draftManager.loadDraft('auto-key')).toBe('v-1');
    });

    it('skips saving when getContent returns null', () => {
      const stop = draftManager.startAutoSave('auto-key', () => null, 10_000);
      vi.advanceTimersByTime(10_000);
      expect(draftManager.loadDraft('auto-key')).toBeNull();
      stop();
    });

    it('defaults to 30 second interval', () => {
      const getContent = () => 'data';
      const stop = draftManager.startAutoSave('auto-key', getContent);

      vi.advanceTimersByTime(29_999);
      expect(draftManager.loadDraft('auto-key')).toBeNull();

      vi.advanceTimersByTime(1);
      expect(draftManager.loadDraft('auto-key')).toBe('data');

      stop();
    });
  });
});
