import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { applyDirection } from '@/lib/directionManager';

export type Language = 'en' | 'ar';

interface LanguageContextValue {
  language: Language;
  direction: 'ltr' | 'rtl';
  setLanguage: (lang: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  direction: 'ltr',
  setLanguage: async () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const { i18n } = useTranslation();
  const { user, profile } = useAuth();
  const profileLang = ((profile?.preferred_language as Language) || 'en') as Language;
  const [language, setLanguageState] = useState<Language>(profileLang);

  const direction: 'ltr' | 'rtl' = language === 'ar' ? 'rtl' : 'ltr';

  // Apply direction via directionManager
  useEffect(() => {
    applyDirection(language);
  }, [language]);

  // Sync language when profile preference changes
  useEffect(() => {
    if (profileLang !== language) {
      setLanguageState(profileLang);
      i18n.changeLanguage(profileLang);
    }
    // Only react to profileLang changes, not language
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLang]);

  const setLanguage = useCallback(
    async (lang: Language) => {
      setLanguageState(lang);
      i18n.changeLanguage(lang);
      localStorage.setItem('edeviser-language', lang);
      applyDirection(lang);

      if (user?.id) {
        await supabase
          .from('profiles')
          .update({ preferred_language: lang } as Record<string, unknown>)
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) console.error('[LanguageProvider] Failed to save preference:', error.message);
          });
      }
    },
    [i18n, user?.id],
  );

  const value = useMemo(
    () => ({ language, direction, setLanguage }),
    [language, direction, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
