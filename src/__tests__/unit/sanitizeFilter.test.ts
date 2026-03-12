import { describe, it, expect } from 'vitest';
import { sanitizePostgrestValue } from '@/lib/sanitizeFilter';

describe('sanitizePostgrestValue', () => {
  it('escapes dots', () => {
    expect(sanitizePostgrestValue('a.b')).toBe('a\\.b');
  });

  it('escapes commas', () => {
    expect(sanitizePostgrestValue('a,b')).toBe('a\\,b');
  });

  it('escapes parentheses', () => {
    expect(sanitizePostgrestValue('a(b)c')).toBe('a\\(b\\)c');
  });

  it('escapes percent signs', () => {
    expect(sanitizePostgrestValue('100%')).toBe('100\\%');
  });

  it('escapes asterisks', () => {
    expect(sanitizePostgrestValue('a*b')).toBe('a\\*b');
  });

  it('escapes backslashes', () => {
    expect(sanitizePostgrestValue('a\\b')).toBe('a\\\\b');
  });

  it('escapes multiple special characters in one string', () => {
    expect(sanitizePostgrestValue('name.ilike.%admin%,role.eq.admin'))
      .toBe('name\\.ilike\\.\\%admin\\%\\,role\\.eq\\.admin');
  });

  it('returns plain strings unchanged', () => {
    expect(sanitizePostgrestValue('hello world')).toBe('hello world');
  });

  it('handles empty string', () => {
    expect(sanitizePostgrestValue('')).toBe('');
  });

  it('handles string with only special characters', () => {
    expect(sanitizePostgrestValue('.,()%*\\')).toBe('\\.\\,\\(\\)\\%\\*\\\\');
  });
});
