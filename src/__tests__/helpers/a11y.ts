import { axe } from 'vitest-axe';
import type { RunOptions, AxeResults } from 'axe-core';
import { expect } from 'vitest';

export async function checkA11y(
  container: Element,
  options?: RunOptions,
): Promise<AxeResults> {
  const results = await axe(container, options);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (expect(results) as any).toHaveNoViolations();
  return results;
}
