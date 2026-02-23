import { cn } from '@/lib/utils';

interface ShimmerProps {
  className?: string;
}

const Shimmer = ({ className }: ShimmerProps) => (
  <div className={cn('animate-shimmer rounded-xl', className)} />
);

export default Shimmer;
