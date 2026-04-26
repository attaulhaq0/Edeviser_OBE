import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuickThoughtInputProps {
  onSubmit: (text: string) => void;
  maxLength?: number;
  isSubmitting?: boolean;
}

const QuickThoughtInput = ({
  onSubmit,
  maxLength = 280,
  isSubmitting = false,
}: QuickThoughtInputProps) => {
  const [text, setText] = useState('');
  const isValid = text.trim().length > 0 && text.length <= maxLength;

  const handleSubmit = () => {
    if (isValid) {
      onSubmit(text.trim());
      setText('');
    }
  };

  return (
    <div className="space-y-2" data-testid="quick-thought-input">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <MessageSquare className="h-4 w-4 text-gray-500" />
        <span>Quick Thought</span>
      </div>
      <div className="flex items-center gap-2">
        <Input
          placeholder="What did you learn or accomplish?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={maxLength}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && isValid && !isSubmitting) handleSubmit();
          }}
          aria-label="Quick thought"
        />
        <Button
          size="sm"
          disabled={!isValid || isSubmitting}
          onClick={handleSubmit}
          className={cn(
            'min-h-[44px] min-w-[44px] font-semibold shrink-0',
            isValid
              ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95'
              : '',
          )}
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
        </Button>
      </div>
      <p className="text-xs text-gray-400 text-end">
        {text.length}/{maxLength}
      </p>
    </div>
  );
};

export default QuickThoughtInput;
