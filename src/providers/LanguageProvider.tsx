import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useDebouncedProfilePreference } from "@/hooks/useDebouncedProfilePreference";
import { applyDirection } from "@/lib/directionManager";
import {
  isLanguage,
  resolveInitialLanguage,
  resolveProfileLanguage,
  type Language,
} from "@/lib/languagePreference";

export type { Language } from "@/lib/languagePreference";

interface LanguageContextValue {
  language: Language;
  direction: "ltr" | "rtl";
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  direction: "ltr",
  setLanguage: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const { i18n } = useTranslation();
  const { user, profile } = useAuth();
  const userId = user?.id;
  const commitPreference = useDebouncedProfilePreference(userId);
  const profileLang = userId && profile?.id === userId
    ? resolveProfileLanguage(profile)
    : undefined;
  const [language, setLanguageState] = useState<Language>(() => resolveInitialLanguage(
    profileLang,
    localStorage.getItem("edeviser-language"),
    i18n.resolvedLanguage ?? i18n.language
  ));
  const locallyChosenRef = useRef(false);

  useEffect(() => {
    locallyChosenRef.current = false;
  }, [userId]);

  const direction: "ltr" | "rtl" = language === "ar" ? "rtl" : "ltr";

  // One synchronization path for initial device state, profile hydration, and
  // explicit choices. AuthProvider publishes profile data but never sets i18n.
  useEffect(() => {
    localStorage.setItem("edeviser-language", language);
    void i18n.changeLanguage(language).catch(() => {
      console.error("[LanguageProvider] Failed to synchronize language");
    });
    applyDirection(language);
  }, [language, i18n]);

  // Rehydrate when identity changes even if both accounts have the same saved
  // language. Do not let a late profile response replace a newer local choice.
  useEffect(() => {
    if (profileLang !== undefined && !locallyChosenRef.current) {
      // Profile hydration is identity-scoped; explicit choices use the guarded callback.
      setLanguageState(profileLang);
    }
  }, [userId, profileLang]);

  const setLanguage = useCallback(
    (lang: Language) => {
      if (!isLanguage(lang)) return;
      commitPreference({ preferred_language: lang }, () => {
        locallyChosenRef.current = true;
        setLanguageState(lang);
      });
    },
    [commitPreference]
  );

  const value = useMemo(
    () => ({ language, direction, setLanguage }),
    [language, direction, setLanguage]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
