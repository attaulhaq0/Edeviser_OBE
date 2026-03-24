import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PracticeModeBannerProps {
  className?: string;
}

const PracticeModeBanner = ({ className }: PracticeModeBannerProps) => {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700',
        className,
      )}
      role="status"
      aria-label="Practice Mode"
    >
      <Info className="h-4 w-4 shrink-0" />
      Practice Mode — This attempt will not affect your grades
    </div>
  );
};

export { PracticeModeBanner };
export default PracticeModeBanner;
