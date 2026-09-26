const RTL_LANGUAGES = ["ar", "he", "fa", "ur"];

/** Returns layout direction; locale typography is owned by CSS. */
export const getDirection = (language: string): "rtl" | "ltr" => {
  const primaryLanguage = language.toLowerCase().split("-")[0] ?? "";
  return RTL_LANGUAGES.includes(primaryLanguage) ? "rtl" : "ltr";
};

/** Applies dir/lang only. Idempotent and independent of reading-font state. */
export const applyDirection = (language: string): void => {
  const htmlEl = document.documentElement;
  htmlEl.setAttribute("dir", getDirection(language));
  htmlEl.setAttribute("lang", language);
};
