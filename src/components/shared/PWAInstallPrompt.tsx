// Task 82.4: PWA install prompt — shows install banner on mobile

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

const DISMISS_KEY = 'edeviser_pwa_dismiss';
const DISMISS_DAYS = 30;

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed && Date.now() - Number(dismissed) < DISMISS_DAYS * 86400000) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 z-50 md:inset-x-auto md:end-4 md:start-auto md:w-80">
      <Card className="bg-white border-0 shadow-lg rounded-xl">
        <CardContent className="flex items-center gap-3 p-4">
          <Download className="h-5 w-5 text-blue-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Install Edeviser</p>
            <p className="text-xs text-gray-500">Add to your home screen for quick access</p>
          </div>
          <Button size="sm" onClick={handleInstall} className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95">
            Install
          </Button>
          <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

// Type augmentation for BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default PWAInstallPrompt;
