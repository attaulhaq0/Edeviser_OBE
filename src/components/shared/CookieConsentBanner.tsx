// Task 86: Cookie consent banner
// Fixed bottom banner, shown on first visit when no consent in localStorage

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getConsent, setConsent, initAnalyticsIfConsented } from '@/lib/analyticsConsent';
import { Cookie } from 'lucide-react';

// Initialize analytics on module load if already consented
initAnalyticsIfConsented();

const CookieConsentBanner = () => {
  const [visible, setVisible] = useState(() => getConsent() === null);

  const handleAcceptAll = () => {
    setConsent({ essential: true, analytics: true });
    initAnalyticsIfConsented();
    setVisible(false);
  };

  const handleRejectNonEssential = () => {
    setConsent({ essential: true, analytics: false });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4">
      <Card className="bg-white border-0 shadow-lg rounded-xl max-w-2xl mx-auto">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4">
          <div className="flex items-start gap-3 flex-1">
            <Cookie className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-700">
              We use cookies to improve your experience. Essential cookies are always active.
              You can choose to enable analytics cookies to help us improve the platform.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRejectNonEssential}
            >
              Reject Non-Essential
            </Button>
            <Button
              size="sm"
              onClick={handleAcceptAll}
              className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95"
            >
              Accept All
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CookieConsentBanner;
