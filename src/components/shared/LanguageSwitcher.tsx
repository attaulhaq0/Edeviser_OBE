import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";

const languages = [
  { code: "en", nativeLabel: "English" },
  { code: "ar", nativeLabel: "العربية" },
] as const;

export const LanguageSwitcher = () => {
  const { t } = useTranslation("common");
  const { language, direction, setLanguage } = useLanguage();
  const currentLang = languages.find((entry) => entry.code === language) ?? languages[0];

  return (
    <DropdownMenu dir={direction}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          aria-label={t("header.languageMenu", { language: currentLang.nativeLabel })}
        >
          <Globe className="h-4 w-4" />
          {currentLang.nativeLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onSelect={() => setLanguage(lang.code)}
            className={language === lang.code ? "bg-accent" : ""}
            aria-current={language === lang.code ? "true" : undefined}
          >
            {lang.nativeLabel}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
