const OPENDYSLEXIC_URL =
  "https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/open-dyslexic-regular.woff2";

let fontLoaded = false;

export const loadDyslexiaFont = async (): Promise<void> => {
  if (fontLoaded) return;
  try {
    const font = new FontFace("OpenDyslexic", `url(${OPENDYSLEXIC_URL})`);
    const loaded = await font.load();
    document.fonts.add(loaded);
    fontLoaded = true;
  } catch (error) {
    console.error("Failed to load OpenDyslexic font:", error);
  }
};

export const applyDyslexiaFont = (enabled: boolean): void => {
  const root = document.documentElement;
  if (enabled) {
    loadDyslexiaFont();
    root.style.setProperty(
      "--font-body",
      '"OpenDyslexic", "Noto Sans", ui-sans-serif, system-ui, sans-serif'
    );
  } else {
    root.style.removeProperty("--font-body");
  }
};

/** Reset internal state — used for testing */
export const _resetFontLoaded = (): void => {
  fontLoaded = false;
};
