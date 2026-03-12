/**
 * Escapes PostgREST special characters in user-provided search strings
 * to prevent filter injection when interpolating into `.or()` expressions.
 *
 * Characters escaped: . , ( ) % * \
 *
 * @example
 * sanitizePostgrestValue('admin%') // => 'admin\\%'
 * sanitizePostgrestValue('a.b,c(d)') // => 'a\\.b\\,c\\(d\\)'
 */
export function sanitizePostgrestValue(input: string): string {
  return input.replace(/[.,()%\\*]/g, (char) => `\\${char}`);
}
