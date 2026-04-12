// Task 81.5: Language selector dropdown — English, اردو (Urdu), العربية (Arabic)

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage, type Language } from '@/providers/LanguageProvider';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ur', label: 'اردو' },
  { value: 'ar', label: 'العربية' },
] as const;

const LanguageSelector = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-gray-500" />
      <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
        <SelectTrigger className="w-36 bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((lang) => (
            <SelectItem key={lang.value} value={lang.value}>
              {lang.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSelector;
