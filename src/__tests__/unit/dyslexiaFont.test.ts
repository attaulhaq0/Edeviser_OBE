// Feature: i18n-rtl-support, Property 12: Dyslexia Font Toggle Consistency
// **Validates: Requirements 24.2, 24.3**

import { describe, it, expect, beforeEach } from 'vitest';
import { applyDyslexiaFont } from '@/lib/fontPreferences';

describe('dyslexiaFont', () => {
  beforeEach(() => {
    document.documentElement.style.removeProperty('--font-body');
  });

  it('applyDyslexiaFont(true) sets --font-body CSS variable with OpenDyslexic', () => {
    applyDyslexiaFont(true);
    const fontBody = document.documentElement.style.getPropertyValue('--font-body');
    expect(fontBody).toContain('OpenDyslexic');
  });

  it('applyDyslexiaFont(false) removes --font-body CSS variable', () => {
    applyDyslexiaFont(true);
    expect(
      document.documentElement.style.getPropertyValue('--font-body'),
    ).toContain('OpenDyslexic');

    applyDyslexiaFont(false);
    const fontBody = document.documentElement.style.getPropertyValue('--font-body');
    expect(fontBody).toBe('');
  });

  it('toggling on then off restores original state', () => {
    const originalFont = document.documentElement.style.getPropertyValue('--font-body');
    applyDyslexiaFont(true);
    applyDyslexiaFont(false);
    expect(document.documentElement.style.getPropertyValue('--font-body')).toBe(
      originalFont,
    );
  });
});
