import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { X, Eye } from 'lucide-react';
import {
  useAccessibilityPreferences,
  useUpdateAccessibilityPreferences,
} from '@/hooks/useAccessibilityPreferences';

interface CognitiveLoadIndicatorProps {
  sectionCount: number;
  threshold?: number;
  pageId: string;
}

const DISMISSED_KEY = 'edeviser-cognitive-dismissed';

export const CognitiveLoadIndicator = ({
  sectionCount,
  threshold = 6,
  pageId,
}: CognitiveLoadIndicatorProps) => {
  const { t } = useTranslation('common');
  const { data: prefs } = useAccessibilityPreferences();
  const updatePrefs = useUpdateAccessibilityPreferences();
  const [dismissed, setDismissed] = useState(() => {
    const dismissedPages: string[] = JSON.parse(
      localStorage.getItem(DISMISSED_KEY) || '[]',
    );
    return dismissedPages.includes(pageId);
  });

  // Re-check when pageId changes
  useEffect(() => {
    const dismissedPages: string[] = JSON.parse(
      localStorage.getItem(DISMISSED_KEY) || '[]',
    );
    if (dismissedPages.includes(pageId) && !dismissed) {
      // Defer state update to avoid synchronous setState in effect
      queueMicrotask(() => setDismissed(true));
    }
  }, [pageId, dismissed]);

  if (dismissed || sectionCount <= threshold || prefs?.simplified_view) return null;

  const handleDismiss = () => {
    const dismissedPages: string[] = JSON.parse(
      localStorage.getItem(DISMISSED_KEY) || '[]',
    );
    localStorage.setItem(
      DISMISSED_KEY,
      JSON.stringify([...dismissedPages, pageId]),
    );
    setDismissed(true);
  };

  const handleSimplify = () => {
    if (prefs) {
      updatePrefs.mutate({ ...prefs, simplified_view: true });
    }
    handleDismiss();
  };

  return (
    <div
      role="status"
      className="flex items-center justify-between gap-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"
    >
      <p>
        {t('accessibility.cognitiveLoadMessage', {
          defaultValue:
            'This page has a lot of information — would you like a simplified view?',
        })}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSimplify}
          className="gap-1"
        >
          <Eye className="h-4 w-4" />
          {t('accessibility.simplifiedView', {
            defaultValue: 'Simplified View',
          })}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          aria-label={t('buttons.close', { defaultValue: 'Close' })}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
