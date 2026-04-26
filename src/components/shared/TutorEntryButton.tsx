import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TutorEntryButtonProps {
  /** Course ID to scope the conversation */
  courseId?: string;
  /** CLO IDs to focus the conversation */
  cloIds?: string[];
  /** Button label override */
  label?: string;
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost';
  /** Additional CSS classes */
  className?: string;
  /** Compact size for inline use */
  compact?: boolean;
}

const TutorEntryButton = ({
  courseId,
  cloIds,
  label = 'Ask Tutor',
  variant = 'outline',
  className,
  compact = false,
}: TutorEntryButtonProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    const params = new URLSearchParams();
    if (courseId) params.set('course_id', courseId);
    if (cloIds && cloIds.length > 0) params.set('clo_ids', cloIds.join(','));

    const queryString = params.toString();
    navigate(`/student/tutor${queryString ? `?${queryString}` : ''}`);
  };

  return (
    <Button
      variant={variant}
      size={compact ? 'sm' : 'default'}
      className={cn(
        'gap-1.5',
        variant === 'default' &&
          'bg-gradient-to-r from-teal-500 to-blue-600 text-white hover:from-teal-600 hover:to-blue-700 active:scale-95',
        variant === 'outline' &&
          'border-blue-200 text-blue-600 hover:bg-blue-50',
        className,
      )}
      onClick={handleClick}
    >
      <Sparkles className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
      {label}
    </Button>
  );
};

export default TutorEntryButton;
