const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

/**
 * Returns the text direction for a given language code.
 */
export const getDirection = (language: string): 'rtl' | 'ltr' => {
  return RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';
};

/**
 * Applies the correct dir, lang, and font-family to the <html> element
 * based on the active language. Idempotent — safe to call multiple times.
 */
export const applyDirection = (language: string): void => {
  const dir = getDirection(language);
  const htmlEl = document.documentElement;
  htmlEl.setAttribute('dir', dir);
  htmlEl.setAttribute('lang', language);

  if (dir === 'rtl') {
    htmlEl.style.fontFamily =
      '"Noto Sans Arabic", "Noto Sans", ui-sans-serif, system-ui, sans-serif';
  } else {
    htmlEl.style.fontFamily =
      '"Noto Sans", ui-sans-serif, system-ui, sans-serif';
  }
};
