import { describe, it, expect } from 'vitest';
import { resolveThemeProperties } from '@/lib/themeResolver';

describe('resolveThemeProperties', () => {
  it('returns empty object for empty metadata', () => {
    expect(resolveThemeProperties({})).toEqual({});
  });

  it('maps known keys to CSS custom properties', () => {
    const result = resolveThemeProperties({
      primary: '#3b82f6',
      secondary: '#14b8a6',
    });
    expect(result).toEqual({
      '--brand-primary': '#3b82f6',
      '--brand-secondary': '#14b8a6',
    });
  });

  it('maps all supported keys', () => {
    const metadata = {
      primary: '#111',
      primaryDark: '#222',
      secondary: '#333',
      gradientStart: '#444',
      gradientEnd: '#555',
      accent: '#666',
      surface: '#777',
      text: '#888',
    };
    const result = resolveThemeProperties(metadata);
    expect(result).toEqual({
      '--brand-primary': '#111',
      '--brand-primary-dark': '#222',
      '--brand-secondary': '#333',
      '--gradient-start': '#444',
      '--gradient-end': '#555',
      '--theme-accent': '#666',
      '--theme-surface': '#777',
      '--theme-text': '#888',
    });
  });

  it('ignores unknown keys', () => {
    const result = resolveThemeProperties({
      primary: '#3b82f6',
      unknownKey: '#000',
    });
    expect(result).toEqual({ '--brand-primary': '#3b82f6' });
  });

  it('ignores non-string values', () => {
    const result = resolveThemeProperties({
      primary: '#3b82f6',
      secondary: 42,
      accent: null,
      surface: undefined,
      text: true,
    });
    expect(result).toEqual({ '--brand-primary': '#3b82f6' });
  });

  it('ignores empty string values', () => {
    const result = resolveThemeProperties({
      primary: '',
      secondary: '#14b8a6',
    });
    expect(result).toEqual({ '--brand-secondary': '#14b8a6' });
  });
});
