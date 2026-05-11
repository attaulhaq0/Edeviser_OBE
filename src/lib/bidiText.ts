/**
 * Wraps a string in Unicode LTR isolate characters for embedding
 * LTR content (codes, English terms) within RTL text.
 */
export const ltrIsolate = (text: string): string => {
  return `\u2066${text}\u2069`; // LRI ... PDI
};

/**
 * Wraps a string in Unicode RTL isolate characters for embedding
 * RTL content within LTR text.
 */
export const rtlIsolate = (text: string): string => {
  return `\u2067${text}\u2069`; // RLI ... PDI
};

/**
 * Detects if a string starts with an RTL character.
 */
export const startsWithRTL = (text: string): boolean => {
  const rtlRegex =
    /^[\u0591-\u07FF\u200F\u202B\u202E\uFB1D-\uFDFD\uFE70-\uFEFC]/;
  return rtlRegex.test(text.trim());
};
