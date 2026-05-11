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
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { applyDirection } from "@/lib/directionManager";

export type Language = "en" | "ar";

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
  const profileLang = ((profile?.preferred_language as Language) ||
    "en") as Language;
  const [language, setLanguageState] = useState<Language>(profileLang);
  // Debounce timer ref — prevents multiple DB writes on rapid language changes
  const dbWriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const direction: "ltr" | "rtl" = language === "ar" ? "rtl" : "ltr";

  // Apply direction via directionManager
  useEffect(() => {
    applyDirection(language);
  }, [language]);

  // Sync language when profile preference changes (one-way: profile → state)
  useEffect(() => {
    if (profileLang !== language) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: sync state from profile preference
      setLanguageState(profileLang);
      i18n.changeLanguage(profileLang);
    }
    // Only react to profileLang changes, not language
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLang]);

  const userId = user?.id;

  const setLanguage = useCallback(
    (lang: Language) => {
      setLanguageState(lang);
      void i18n.changeLanguage(lang);
      localStorage.setItem("edeviser-language", lang);
      applyDirection(lang);

      if (!userId) return;

      // Debounce: cancel any pending write and schedule a new one after 800ms
      if (dbWriteTimerRef.current) {
        clearTimeout(dbWriteTimerRef.current);
      }
      dbWriteTimerRef.current = setTimeout(() => {
        supabase
          .from("profiles")
          .update({ preferred_language: lang } as never)
          .eq("id", userId)
          .then(({ error }) => {
            if (error) {
              console.error(
                "[LanguageProvider] Failed to save preference:",
                error.message
              );
            }
          });
      }, 800);
    },
    [i18n, userId]
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
