import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { useUpdateLanguagePreference } from "@/hooks/useLanguagePreference";
import { useAuth } from "@/hooks/useAuth";

const languages = [
  { code: "en", nativeLabel: "English" },
  { code: "ar", nativeLabel: "العربية" },
] as const;

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const updatePreference = useUpdateLanguagePreference();

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem("edeviser-language", langCode);
    if (user) {
      updatePreference.mutate(langCode);
    }
  };

  const currentLang =
    languages.find((l) => l.code === i18n.language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          aria-label={`Language: ${currentLang.nativeLabel}`}
        >
          <Globe className="h-4 w-4" />
          {currentLang.nativeLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={i18n.language === lang.code ? "bg-accent" : ""}
            aria-current={i18n.language === lang.code ? "true" : undefined}
          >
            {lang.nativeLabel}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
