import { cn } from '@/lib/utils';

interface ShimmerProps {
  className?: string;
}

const Shimmer = ({ className }: ShimmerProps) => (
  <div className={cn('animate-pulse rounded-xl bg-slate-200', className)} />
);

export default Shimmer;
