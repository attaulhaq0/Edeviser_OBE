import { Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SaleBadgeProps {
  discountPercentage: number;
  className?: string;
}

const SaleBadge = ({ discountPercentage, className }: SaleBadgeProps) => {
  if (discountPercentage <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black tracking-wide uppercase text-white',
        className,
      )}
    >
      <Tag className="h-3 w-3" />
      {discountPercentage}% OFF
    </span>
  );
};

export default SaleBadge;
