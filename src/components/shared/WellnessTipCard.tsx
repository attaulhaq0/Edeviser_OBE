import { Lightbulb, ExternalLink, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { WellnessTip } from '@/types/habits';

export interface WellnessTipCardProps {
  tip: WellnessTip;
  isOnboarding: boolean;
  onDismiss?: () => void;
}

const WellnessTipCard = ({ tip, isOnboarding, onDismiss }: WellnessTipCardProps) => {
  return (
    <Card
      data-testid="wellness-tip-card"
      className="bg-amber-50 border-amber-200 shadow-sm rounded-xl p-3"
    >
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-amber-100 shrink-0">
          <Lightbulb className="h-4 w-4 text-amber-600" />
        </div>

        <div className="flex-1 min-w-0">
          <p data-testid="wellness-tip-text" className="text-sm text-amber-900">
            {tip.text}
          </p>

          {tip.resourceUrl && (
            <a
              data-testid="wellness-tip-resource"
              href={tip.resourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 mt-1.5 font-medium"
            >
              {tip.resourceLabel ?? 'Learn more'}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {isOnboarding && onDismiss && (
          <Button
            data-testid="wellness-tip-dismiss"
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 shrink-0 text-amber-500 hover:text-amber-700 hover:bg-amber-100"
            aria-label="Dismiss tip"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </Card>
  );
};

export default WellnessTipCard;
