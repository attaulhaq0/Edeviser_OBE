import { Sparkles, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import SatisfactionRating from '@/components/shared/SatisfactionRating';
import SourceCitationPanel from '@/components/shared/SourceCitationPanel';
import type { TutorMessage } from '@/lib/tutorSchemas';

interface ChatMessageProps {
  message: TutorMessage;
  onRate?: (messageId: string, rating: 'thumbs_up' | 'thumbs_down') => void;
  isStreaming?: boolean;
}

/**
 * Renders inline citation markers [1], [2] etc. as clickable badges within text.
 */
function renderContentWithCitations(content: string): React.ReactNode[] {
  const parts = content.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      return (
        <Badge
          key={i}
          variant="outline"
          className="inline-flex h-4 px-1 text-[10px] font-bold mx-0.5 cursor-pointer hover:bg-blue-50 align-baseline"
        >
          {match[1]}
        </Badge>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const ChatMessage = ({ message, onRate, isStreaming = false }: ChatMessageProps) => {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 max-w-[85%]',
        isUser ? 'ms-auto flex-row-reverse' : 'me-auto',
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
          isUser ? 'bg-blue-100' : 'bg-gradient-to-br from-teal-500 to-blue-600',
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-blue-600" />
        ) : (
          <Sparkles className="h-4 w-4 text-white" />
        )}
      </div>

      {/* Message bubble */}
      <div className="flex flex-col gap-1">
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed',
            isUser
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-white border border-slate-200 text-gray-800 rounded-bl-md shadow-sm',
          )}
        >
          {/* Message content */}
          <div className="whitespace-pre-wrap break-words">
            {isUser ? message.content : renderContentWithCitations(message.content)}
          </div>

          {/* Streaming indicator */}
          {isStreaming && !isUser && (
            <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ms-0.5 rounded-sm" />
          )}

          {/* Image attachments */}
          {message.image_urls && message.image_urls.length > 0 && (
            <div className="flex gap-2 mt-2">
              {message.image_urls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Attachment ${i + 1}`}
                  className="max-w-[200px] max-h-[200px] rounded-lg object-cover"
                />
              ))}
            </div>
          )}

          {/* Integrity flag */}
          {message.flagged_integrity && (
            <div className="mt-2 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
              ⚠ Academic integrity reminder included
            </div>
          )}
        </div>

        {/* Source citations (assistant messages only) */}
        {!isUser && message.source_citations && message.source_citations.length > 0 && (
          <SourceCitationPanel citations={message.source_citations} />
        )}

        {/* Satisfaction rating (assistant messages only) */}
        {!isUser && onRate && !isStreaming && (
          <SatisfactionRating
            messageId={message.id}
            currentRating={message.satisfaction_rating}
            onRate={onRate}
          />
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
