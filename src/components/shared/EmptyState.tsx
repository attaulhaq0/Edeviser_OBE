// =============================================================================
// EmptyState — Generic empty state with icon, title, description
// =============================================================================

import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

const EmptyState = ({ icon, title, description, children, className }: EmptyStateProps) => (
  <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
    <div className="mb-4 rounded-full bg-slate-100 p-4">
      {icon ?? <Inbox className="h-8 w-8 text-gray-400" />}
    </div>
    <h3 className="text-lg font-bold tracking-tight text-gray-900">{title}</h3>
    {description && <p className="mt-1 text-sm text-gray-500 max-w-sm">{description}</p>}
    {children && <div className="mt-4">{children}</div>}
  </div>
);

export default EmptyState;
export type { EmptyStateProps };
