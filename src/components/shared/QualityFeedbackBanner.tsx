import { Sparkles, ThumbsUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QualityCategory } from '@/types/planner';

export interface QualityFeedbackBannerProps {
  qualityCategory: QualityCategory;
  suggestions: string[];
}

const categoryConfig: Record<
  QualityCategory,
  { label: string; icon: React.ReactNode; bg: string; text: string; border: string }
> = {
  thoughtful: {
    label: 'Thoughtful reflection',
    icon: <Sparkles className="h-4 w-4" />,
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
  },
  good_effort: {
    label: 'Good effort',
    icon: <ThumbsUp className="h-4 w-4" />,
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  needs_detail: {
    label: 'Try adding more detail',
    icon: <AlertCircle className="h-4 w-4" />,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
};

const QualityFeedbackBanner = ({
  qualityCategory,
  suggestions,
}: QualityFeedbackBannerProps) => {
  const config = categoryConfig[qualityCategory];

  return (
    <div
      className={cn(
        'rounded-lg border p-3 space-y-1.5',
        config.bg,
        config.border,
      )}
      data-testid="quality-feedback-banner"
    >
      <div className={cn('flex items-center gap-2 text-sm font-semibold', config.text)}>
        {config.icon}
        {config.label}
      </div>
      {suggestions.length > 0 && (
        <ul className="space-y-0.5">
          {suggestions.map((s, i) => (
            <li key={i} className={cn('text-xs', config.text, 'opacity-80')}>
              • {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default QualityFeedbackBanner;
