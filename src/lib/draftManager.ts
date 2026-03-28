// Task 54: Draft Manager — auto-save drafts to localStorage
const PREFIX = 'edeviser_draft_';

export const draftManager = {
  saveDraft(key: string, content: unknown): void {
    try {
      localStorage.setItem(`${PREFIX}${key}`, JSON.stringify({ content, savedAt: Date.now() }));
    } catch { /* quota exceeded — silently fail */ }
  },

  loadDraft<T = unknown>(key: string): T | null {
    try {
      const raw = localStorage.getItem(`${PREFIX}${key}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.content as T;
    } catch { return null; }
  },

  clearDraft(key: string): void {
    localStorage.removeItem(`${PREFIX}${key}`);
  },

  startAutoSave(key: string, getContent: () => unknown, intervalMs = 30_000): () => void {
    const timer = setInterval(() => {
      const content = getContent();
      if (content != null) draftManager.saveDraft(key, content);
    }, intervalMs);
    return () => clearInterval(timer);
  },
};
