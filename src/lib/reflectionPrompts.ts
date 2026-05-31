// =============================================================================
// reflectionPrompts — static reflection prompt templates for the journal
// =============================================================================
//
// These are the always-available reflection templates surfaced on the journal
// surface a student reaches from navigation (R10.1). They are intentionally
// CLO-independent so journaling stays possible even when the richer,
// CLO-contextual `generateJournalPrompt` capability is unavailable (R10.3a).
//
// Each template maps to an i18n key under `journal.prompts.*` in the student
// locale so the prompt text is available in both English and Arabic (R10.4).
// This module is pure data — no React, no i18n runtime, no side effects.

export interface ReflectionPromptTemplate {
  /** Stable identifier used as a React key and in tests. */
  id: string;
  /** i18n key (in the `student` namespace) for the prompt's display + seed text. */
  i18nKey: string;
}

export const REFLECTION_PROMPT_TEMPLATES: readonly ReflectionPromptTemplate[] =
  [
    { id: "learned", i18nKey: "journal.prompts.learned" },
    { id: "confused", i18nKey: "journal.prompts.confused" },
    { id: "proud", i18nKey: "journal.prompts.proud" },
  ] as const;

/**
 * Seeds journal content with a selected prompt (R10.2).
 *
 * Pure function: given the current content and a prompt, returns the new
 * content. If the current content is empty the prompt becomes the starting
 * point; otherwise the prompt is appended on a fresh line so existing writing
 * is never lost.
 */
export function seedContentWithPrompt(
  currentContent: string,
  promptText: string
): string {
  const existing = currentContent.trim();
  if (existing.length === 0) {
    return `${promptText}\n\n`;
  }
  return `${existing}\n\n${promptText}\n\n`;
}
