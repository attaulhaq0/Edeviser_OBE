import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, ImagePlus, FileUp, Loader2, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import ChatMessage from '@/components/shared/ChatMessage';
import PersonaSelector from '@/pages/student/tutor/PersonaSelector';
import AutonomyToggle from '@/components/shared/AutonomyToggle';
import { useTutorMessages, useSendMessage, useRateMessage } from '@/hooks/useTutorMessages';
import { useTutorUsage } from '@/hooks/useTutorUsage';
import type { TutorMessage, TutorPersona, SendMessageInput } from '@/lib/tutorSchemas';

interface ChatPanelProps {
  conversationId?: string;
  courseId?: string;
  cloScope?: string[];
  persona: TutorPersona;
  onPersonaChange: (persona: TutorPersona) => void;
  autonomyOverride?: 'L1' | 'L3' | null;
  onAutonomyChange?: (value: 'L1' | 'L3' | null) => void;
}

const MAX_MESSAGE_LENGTH = 2000;
const MAX_IMAGES = 2;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB

const ChatPanel = ({
  conversationId,
  courseId,
  cloScope,
  persona,
  onPersonaChange,
  autonomyOverride = null,
  onAutonomyChange,
}: ChatPanelProps) => {
  const [messageText, setMessageText] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: messages = [], isLoading: isLoadingMessages } = useTutorMessages(conversationId);
  const {
    sendMessage,
    cancelStream,
    isStreaming,
    streamedContent,
    citations,
    error: streamError,
  } = useSendMessage();
  const rateMessage = useRateMessage();
  const { data: usage } = useTutorUsage();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamedContent]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [conversationId]);

  const handleSend = useCallback(async () => {
    const trimmed = messageText.trim();
    if (!trimmed || isStreaming) return;
    if (usage?.is_blocked) return;

    const input: SendMessageInput = {
      message: trimmed,
      persona,
    };

    if (conversationId) {
      input.conversation_id = conversationId;
    }
    if (courseId) {
      input.course_id = courseId;
    }
    if (cloScope && cloScope.length > 0) {
      input.clo_scope = cloScope;
    }
    if (imageUrls.length > 0) {
      input.image_urls = imageUrls;
    }
    if (documentUrl) {
      input.document_url = documentUrl;
    }
    if (autonomyOverride) {
      input.autonomy_override = autonomyOverride;
    }

    setMessageText('');
    setImageUrls([]);
    setDocumentUrl(null);

    await sendMessage(input);
  }, [messageText, isStreaming, usage, conversationId, courseId, cloScope, persona, imageUrls, documentUrl, autonomyOverride, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRate = useCallback(
    (messageId: string, rating: 'thumbs_up' | 'thumbs_down') => {
      rateMessage.mutate({ message_id: messageId, rating });
    },
    [rateMessage],
  );

  const handleImageAttach = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;

      const newUrls: string[] = [];
      for (let i = 0; i < Math.min(files.length, MAX_IMAGES - imageUrls.length); i++) {
        const file = files[i]!;
        if (file.size > MAX_IMAGE_SIZE) continue;
        newUrls.push(URL.createObjectURL(file));
      }
      setImageUrls((prev) => [...prev, ...newUrls].slice(0, MAX_IMAGES));
    };
    input.click();
  };

  const handleDocAttach = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.docx';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || file.size > MAX_DOC_SIZE) return;
      setDocumentUrl(URL.createObjectURL(file));
    };
    input.click();
  };

  // Build the streaming message for display
  const streamingMessage: TutorMessage | null =
    isStreaming && streamedContent
      ? {
          id: 'streaming',
          conversation_id: conversationId ?? '',
          role: 'assistant',
          content: streamedContent,
          source_citations: citations,
          image_urls: [],
          document_url: null,
          token_count: 0,
          satisfaction_rating: null,
          flagged_integrity: false,
          autonomy_level: null,
          nudge_type: null,
          created_at: new Date().toISOString(),
        }
      : null;

  const isInputDisabled = isStreaming || (usage?.is_blocked ?? false);
  const remainingChars = MAX_MESSAGE_LENGTH - messageText.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header with persona selector and autonomy toggle */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-4">
        <PersonaSelector selected={persona} onSelect={onPersonaChange} />
        {onAutonomyChange && (
          <AutonomyToggle
            value={autonomyOverride}
            onChange={onAutonomyChange}
            disabled={isStreaming}
          />
        )}
      </div>

      {/* Usage warning banner */}
      {usage?.is_warning && !usage.is_blocked && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">
            You have {usage.remaining_messages} messages remaining today.
          </p>
        </div>
      )}

      {/* Blocked banner */}
      {usage?.is_blocked && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700">
            You&apos;ve reached your daily message limit. It resets at midnight.
          </p>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 && !streamingMessage ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center mb-4">
              <span className="text-2xl">✨</span>
            </div>
            <h3 className="text-lg font-bold text-gray-800">AI Tutor</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">
              Ask me anything about your course materials. I&apos;ll reference your
              actual course content to help you learn.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onRate={handleRate}
              />
            ))}
            {streamingMessage && (
              <ChatMessage
                message={streamingMessage}
                isStreaming
              />
            )}
          </>
        )}

        {/* Stream error */}
        {streamError && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 rounded-lg border border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{streamError.message}</p>
            <Button
              variant="outline"
              size="sm"
              className="ms-auto"
              onClick={() => handleSend()}
            >
              Retry
            </Button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attachments preview */}
      {(imageUrls.length > 0 || documentUrl) && (
        <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex items-center gap-2 flex-wrap">
          {imageUrls.map((url, i) => (
            <div key={i} className="relative">
              <img
                src={url}
                alt={`Attachment ${i + 1}`}
                className="h-12 w-12 rounded-lg object-cover border border-slate-200"
              />
              <button
                type="button"
                className="absolute -top-1 -end-1 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center"
                onClick={() => setImageUrls((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label="Remove image"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
          {documentUrl && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-slate-200 text-xs">
              <FileUp className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-gray-600">Document attached</span>
              <button
                type="button"
                className="text-red-500 hover:text-red-700"
                onClick={() => setDocumentUrl(null)}
                aria-label="Remove document"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Input area */}
      <div className="px-4 py-3 border-t border-slate-200 bg-white">
        <div className="flex items-end gap-2">
          {/* Attachment buttons */}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-gray-400 hover:text-blue-600"
              onClick={handleImageAttach}
              disabled={isInputDisabled || imageUrls.length >= MAX_IMAGES}
              aria-label="Attach image"
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-gray-400 hover:text-blue-600"
              onClick={handleDocAttach}
              disabled={isInputDisabled || !!documentUrl}
              aria-label="Attach document"
            >
              <FileUp className="h-4 w-4" />
            </Button>
          </div>

          {/* Text input */}
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              onKeyDown={handleKeyDown}
              placeholder={isInputDisabled ? 'Message limit reached' : 'Ask a question...'}
              disabled={isInputDisabled}
              className="pe-16"
            />
            <span
              className={cn(
                'absolute end-3 top-1/2 -translate-y-1/2 text-[10px]',
                remainingChars < 100 ? 'text-amber-500' : 'text-gray-300',
                remainingChars < 0 && 'text-red-500',
              )}
            >
              {remainingChars}
            </span>
          </div>

          {/* Send / Cancel button */}
          {isStreaming ? (
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={cancelStream}
            >
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-9 bg-gradient-to-r from-teal-500 to-blue-600 text-white hover:from-teal-600 hover:to-blue-700 active:scale-95"
              onClick={handleSend}
              disabled={!messageText.trim() || isInputDisabled}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
