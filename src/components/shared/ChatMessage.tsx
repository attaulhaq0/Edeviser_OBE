// =============================================================================
// ChatMessage — Message bubble with markdown, citations, and rating
// =============================================================================

import { useState, useCallback } from "react";
import { Bot, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import SatisfactionRating from "@/components/shared/SatisfactionRating";
import SourceCitationPanel from "@/components/shared/SourceCitationPanel";
import type {
  TutorMessage,
  SatisfactionRating as SatisfactionRatingType,
} from "@/lib/tutorSchemas";

interface ChatMessageProps {
  message: TutorMessage;
  onRate?: (variables: {
    messageId: string;
    conversationId: string;
    rating: SatisfactionRatingType;
  }) => void;
  isRatingPending?: boolean;
}

type TFn = (key: string, options?: Record<string, unknown>) => string;

/** Parse markdown-like content into simple rendered elements */
const renderContent = (
  content: string,
  t: TFn,
  onCitationClick?: (index: number) => void
): React.ReactNode => {
  // Split content into segments, handling citation markers [1], [2], etc.
  const parts = content.split(/(\[\d+\])/g);

  return parts.map((part, i) => {
    const citationMatch = part.match(/^\[(\d+)\]$/);
    if (citationMatch && citationMatch[1]) {
      const citationIndex = parseInt(citationMatch[1], 10) - 1;
      return (
        <button
          key={i}
          onClick={() => onCitationClick?.(citationIndex)}
          className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold hover:bg-blue-200 transition-colors align-super ms-0.5 me-0.5"
          aria-label={t("tutor.chat.citationLabel", {
            number: citationMatch[1],
          })}
        >
          {citationMatch[1]}
        </button>
      );
    }

    // Simple markdown rendering for assistant messages
    return <SimpleMarkdown key={i} text={part} />;
  });
};

/** Minimal markdown renderer for bold, italic, code blocks, and lists */
const SimpleMarkdown = ({ text }: { text: string }) => {
  // Handle code blocks
  if (text.includes("```")) {
    const segments = text.split(/(```[\s\S]*?```)/g);
    return (
      <>
        {segments.map((segment, i) => {
          if (segment.startsWith("```") && segment.endsWith("```")) {
            const codeContent = segment.slice(3, -3);
            // Remove optional language identifier from first line
            const firstNewline = codeContent.indexOf("\n");
            const code =
              firstNewline > -1
                ? codeContent.slice(firstNewline + 1)
                : codeContent;
            return (
              <pre
                key={i}
                className="my-2 rounded-lg bg-gray-900 text-gray-100 p-3 text-xs overflow-x-auto"
              >
                <code>{code.trim()}</code>
              </pre>
            );
          }
          return <InlineMarkdown key={i} text={segment} />;
        })}
      </>
    );
  }

  return <InlineMarkdown text={text} />;
};

/** Handle inline markdown: bold, italic, inline code, line breaks */
const InlineMarkdown = ({ text }: { text: string }) => {
  // Split by lines to handle lists and paragraphs
  const lines = text.split("\n");

  return (
    <>
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // Unordered list items
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-2 ps-2">
              <span className="text-gray-400 shrink-0">•</span>
              <span>{renderInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Ordered list items
        const orderedMatch = trimmed.match(/^(\d+)\.\s/);
        if (orderedMatch) {
          return (
            <div key={i} className="flex gap-2 ps-2">
              <span className="text-gray-400 shrink-0 min-w-4 text-end">
                {orderedMatch[1]}.
              </span>
              <span>{renderInline(trimmed.slice(orderedMatch[0].length))}</span>
            </div>
          );
        }

        // Empty lines become spacing
        if (!trimmed) {
          return i > 0 && i < lines.length - 1 ? (
            <div key={i} className="h-2" />
          ) : null;
        }

        // Regular text
        return (
          <span key={i}>
            {renderInline(line)}
            {i < lines.length - 1 ? " " : ""}
          </span>
        );
      })}
    </>
  );
};

/** Render inline formatting: **bold**, *italic*, `code` */
const renderInline = (text: string): React.ReactNode => {
  // Bold
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Inline code
    const codeParts = part.split(/(`[^`]+`)/g);
    return codeParts.map((cp, j) => {
      if (cp.startsWith("`") && cp.endsWith("`")) {
        return (
          <code
            key={`${i}-${j}`}
            className="px-1 py-0.5 rounded bg-gray-100 text-gray-800 text-xs font-mono"
          >
            {cp.slice(1, -1)}
          </code>
        );
      }
      // Italic
      const italicParts = cp.split(/(\*[^*]+\*)/g);
      return italicParts.map((ip, k) => {
        if (ip.startsWith("*") && ip.endsWith("*") && !ip.startsWith("**")) {
          return <em key={`${i}-${j}-${k}`}>{ip.slice(1, -1)}</em>;
        }
        return <span key={`${i}-${j}-${k}`}>{ip}</span>;
      });
    });
  });
};

const ChatMessage = ({
  message,
  onRate,
  isRatingPending,
}: ChatMessageProps) => {
  const { t } = useTranslation("ai");
  const [expandedCitation, setExpandedCitation] = useState<number | null>(null);
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  const handleCitationClick = useCallback((index: number) => {
    setExpandedCitation((prev) => (prev === index ? null : index));
  }, []);

  return (
    <div
      className={cn(
        "flex gap-3 max-w-full",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
      role="article"
      aria-label={
        isUser
          ? t("tutor.chat.userMessageLabel")
          : t("tutor.chat.tutorMessageLabel")
      }
    >
      {/* Avatar */}
      <div
        className={cn(
          "shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
          isUser ? "bg-blue-100" : "bg-gradient-to-br from-teal-500 to-blue-600"
        )}
        aria-hidden="true"
      >
        {isUser ? (
          <User className="h-4 w-4 text-blue-600" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>

      {/* Message content */}
      <div
        className={cn(
          "flex flex-col max-w-[80%] min-w-0",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-blue-600 text-white rounded-br-md"
              : "bg-white border border-gray-100 shadow-sm text-gray-800 rounded-bl-md"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="whitespace-pre-wrap break-words">
              {renderContent(message.content, t, handleCitationClick)}
            </div>
          )}

          {/* Image attachments */}
          {message.image_urls.length > 0 && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {message.image_urls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={t("tutor.chat.attachmentAlt", { index: i + 1 })}
                  className="rounded-lg max-h-48 max-w-48 object-cover"
                  loading="lazy"
                />
              ))}
            </div>
          )}

          {/* Document attachment */}
          {message.document_url && (
            <div className="mt-2">
              <Badge variant="outline" className="text-xs gap-1">
                📎 {t("tutor.chat.documentAttached")}
              </Badge>
            </div>
          )}
        </div>

        {/* Integrity flag */}
        {message.flagged_integrity && isAssistant && (
          <Badge
            variant="outline"
            className="mt-1 text-[10px] text-amber-600 border-amber-200 bg-amber-50"
          >
            {t("tutor.chat.integrityGuidance")}
          </Badge>
        )}

        {/* Citation panel + rating for assistant messages */}
        {isAssistant && (
          <div className="flex flex-col items-start w-full">
            {message.source_citations.length > 0 && (
              <SourceCitationPanel
                citations={message.source_citations}
                expandedIndex={expandedCitation}
                onExpandedChange={setExpandedCitation}
              />
            )}

            {onRate && (
              <div className="mt-1">
                <SatisfactionRating
                  messageId={message.id}
                  conversationId={message.conversation_id}
                  currentRating={message.satisfaction_rating}
                  onRate={onRate}
                  isPending={isRatingPending}
                />
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-gray-400 mt-1 px-1">
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
};

export default ChatMessage;
export type { ChatMessageProps };
