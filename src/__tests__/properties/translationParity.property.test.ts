// Feature: i18n-rtl-support, Property 2: Translation Key Parity
// **Validates: Requirements 2.6, 2.7**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { resources, namespaces } from '@/lib/i18n';

/**
 * Recursively extracts all dot-separated keys from a nested object.
 */
function extractKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...extractKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

describe('Property 2 — Translation key parity between English and Arabic', () => {
  // Get all namespace names that exist in both languages
  const sharedNamespaces = namespaces.filter(
    (ns) =>
      (resources.en as Record<string, unknown>)[ns] != null &&
      (resources.ar as Record<string, unknown>)[ns] != null,
  );

  it('P2a: for every namespace, all English keys exist in Arabic', () => {
    fc.assert(
      fc.property(fc.constantFrom(...sharedNamespaces), (ns) => {
        const enNs = (resources.en as Record<string, Record<string, unknown>>)[ns];
        const arNs = (resources.ar as Record<string, Record<string, unknown>>)[ns];
        if (!enNs || !arNs) return;
        const enKeys = extractKeys(enNs);
        const arKeys = new Set(extractKeys(arNs));
        const missing = enKeys.filter((k) => !arKeys.has(k));
        expect(missing).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });

  it('P2b: for every namespace, all Arabic keys exist in English', () => {
    fc.assert(
      fc.property(fc.constantFrom(...sharedNamespaces), (ns) => {
        const arNs = (resources.ar as Record<string, Record<string, unknown>>)[ns];
        const enNs = (resources.en as Record<string, Record<string, unknown>>)[ns];
        if (!arNs || !enNs) return;
        const arKeys = extractKeys(arNs);
        const enKeys = new Set(extractKeys(enNs));
        const missing = arKeys.filter((k) => !enKeys.has(k));
        expect(missing).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });
});
