// =============================================================================
// ChatPanel — Message list, text input, file attachments, typing indicator
// =============================================================================

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  ImagePlus,
  FileUp,
  Loader2,
  X,
  AlertTriangle,
  Bot,
  Info,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ChatMessage from "@/components/shared/ChatMessage";
import PersonaSelector from "@/pages/student/tutor/PersonaSelector";
import AutonomyToggle from "@/components/shared/AutonomyToggle";
import { useTutorAttachmentUpload } from "@/hooks/useTutorAttachmentUpload";
import type {
  TutorMessage,
  TutorPersona,
  SatisfactionRating,
  SourceCitation,
  TutorUsageStatus,
} from "@/lib/tutorSchemas";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_MESSAGE_LENGTH = 2000;
const MAX_IMAGES = 2;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png"];
const ACCEPTED_DOC_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  messages: TutorMessage[];
  isLoadingMessages: boolean;
  conversationId?: string;
  courseId?: string;
  persona: TutorPersona;
  onPersonaChange: (persona: TutorPersona) => void;
  onSendMessage: (input: {
    message: string;
    imageUrls?: string[];
    documentUrl?: string;
    onToken: (token: string) => void;
    onCitations: (citations: SourceCitation[]) => void;
    onDone: (data: { message_id: string; tokens_used: number }) => void;
  }) => void;
  onRateMessage: (variables: {
    messageId: string;
    conversationId: string;
    rating: SatisfactionRating;
  }) => void;
  isSending: boolean;
  isRatingPending: boolean;
  usage?: TutorUsageStatus | null;
  /** Current autonomy override for the conversation */
  autonomyOverride?: "L1" | "L3" | null;
  /** Called when the student toggles the autonomy level */
  onAutonomyChange?: (level: "L1" | "L3" | null) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const ChatPanel = ({
  messages,
  isLoadingMessages,
  conversationId,
  persona,
  onPersonaChange,
  onSendMessage,
  onRateMessage,
  isSending,
  isRatingPending,
  usage,
  autonomyOverride,
  onAutonomyChange,
}: ChatPanelProps) => {
  const { t } = useTranslation("ai");
  const [inputValue, setInputValue] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { uploadAttachment } = useTutorAttachmentUpload();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const isLimitReached = usage ? usage.remaining_messages <= 0 : false;
  const isTokenBudgetExceeded = usage
    ? usage.token_count >= usage.daily_token_budget
    : false;
  const isInputDisabled = isLimitReached || isTokenBudgetExceeded;
  const showWarning =
    usage?.warning && !isLimitReached && !isTokenBudgetExceeded;
  const charCount = inputValue.length;
  const isOverLimit = charCount > MAX_MESSAGE_LENGTH;
  const canSend =
    inputValue.trim().length > 0 &&
    !isOverLimit &&
    !isSending &&
    !isStreaming &&
    !isUploading &&
    !isInputDisabled;

  // Auto-scroll to bottom on new messages or streaming content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, [inputValue]);

  // ─── File Handlers ─────────────────────────────────────────────────────────

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      const validFiles: File[] = [];

      for (const file of files) {
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          toast.error(t("tutor.chat.errors.imageType", { name: file.name }));
          continue;
        }
        if (file.size > MAX_IMAGE_SIZE) {
          toast.error(t("tutor.chat.errors.imageSize", { name: file.name }));
          continue;
        }
        validFiles.push(file);
      }

      setImageFiles((prev) => {
        const combined = [...prev, ...validFiles].slice(0, MAX_IMAGES);
        if (prev.length + validFiles.length > MAX_IMAGES) {
          toast.error(t("tutor.chat.errors.maxImages", { count: MAX_IMAGES }));
        }
        return combined;
      });

      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [t]
  );

  const handleDocSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!ACCEPTED_DOC_TYPES.includes(file.type)) {
        toast.error(t("tutor.chat.errors.docType"));
        e.target.value = "";
        return;
      }
      if (file.size > MAX_DOC_SIZE) {
        toast.error(t("tutor.chat.errors.docSize"));
        e.target.value = "";
        return;
      }

      setDocumentFile(file);
      e.target.value = "";
    },
    [t]
  );

  const removeImage = useCallback((index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeDocument = useCallback(() => {
    setDocumentFile(null);
  }, []);

  // ─── Send Handler ──────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!canSend) return;

    const message = inputValue.trim();
    const imagesToUpload = imageFiles;
    const docToUpload = documentFile;

    let imageUrls: string[] = [];
    let documentUrl: string | undefined;

    // Upload any attachments first. If an upload fails, surface the error and
    // abort the send (keeping the message + attachments for retry) so we never
    // pass an empty or undefined reference for a file the student attached.
    if (imagesToUpload.length > 0 || docToUpload) {
      setIsUploading(true);
      try {
        imageUrls = await Promise.all(
          imagesToUpload.map((file) => uploadAttachment(file))
        );
        if (docToUpload) {
          documentUrl = await uploadAttachment(docToUpload);
        }
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : t("tutor.chat.errors.uploadFailed")
        );
        return; // abort the send; composer state is preserved for retry
      } finally {
        setIsUploading(false);
      }
    }

    // Only clear the composer once any uploads have succeeded.
    setInputValue("");
    setImageFiles([]);
    setDocumentFile(null);
    setStreamingContent("");
    setIsStreaming(true);

    onSendMessage({
      message,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      documentUrl,
      onToken: (token) => {
        setStreamingContent((prev) => prev + token);
      },
      onCitations: () => {
        // Citations are handled when the message is persisted
      },
      onDone: () => {
        setStreamingContent("");
        setIsStreaming(false);
      },
    });
  }, [
    canSend,
    inputValue,
    imageFiles,
    documentFile,
    uploadAttachment,
    onSendMessage,
    t,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend]
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header with persona selector */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-800">
            {t("tutor.chat.title")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <PersonaSelector
            selectedPersona={persona}
            onSelect={onPersonaChange}
            variant="inline"
          />
          {onAutonomyChange && (
            <AutonomyToggle
              value={autonomyOverride ?? null}
              onChange={onAutonomyChange}
              disabled={isInputDisabled}
            />
          )}
        </div>
      </div>

      {/* Usage warning banner — shows at 80% of daily limit */}
      {showWarning && usage && (
        <div
          className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-100"
          role="alert"
        >
          <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
          <p className="text-xs font-medium text-amber-700">
            {t("tutor.chat.messagesRemaining", {
              count: usage.remaining_messages,
            })}
          </p>
        </div>
      )}

      {/* Message list */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        role="log"
        aria-label={t("tutor.chat.messagesLabel")}
      >
        {isLoadingMessages ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3",
                  i % 2 === 0 ? "" : "flex-row-reverse"
                )}
              >
                <div className="h-8 w-8 rounded-full animate-shimmer shrink-0" />
                <div
                  className={cn(
                    "space-y-1.5",
                    i % 2 === 0 ? "" : "flex flex-col items-end"
                  )}
                >
                  <div className="h-12 w-48 rounded-2xl animate-shimmer" />
                  <div className="h-3 w-16 rounded animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 && !isStreaming ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50 to-blue-50 mb-4">
              <Bot className="h-10 w-10 text-teal-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">
              {t("tutor.chat.emptyTitle")}
            </h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">
              {t("tutor.chat.emptyBody")}
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onRate={onRateMessage}
                isRatingPending={isRatingPending}
              />
            ))}

            {/* Streaming response */}
            {isStreaming && streamingContent && (
              <ChatMessage
                message={{
                  id: "streaming",
                  conversation_id: conversationId ?? "",
                  role: "assistant",
                  content: streamingContent,
                  source_citations: [],
                  image_urls: [],
                  document_url: null,
                  token_count: 0,
                  satisfaction_rating: null,
                  flagged_integrity: false,
                  autonomy_level: null,
                  nudge_type: null,
                  created_at: new Date().toISOString(),
                }}
              />
            )}

            {/* Typing indicator */}
            {isStreaming && !streamingContent && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-md px-4 py-3">
                  <div
                    className="flex gap-1.5"
                    aria-label={t("tutor.chat.typingLabel")}
                  >
                    <span className="h-2 w-2 rounded-full bg-gray-300 animate-bounce [animation-delay:0ms]" />
                    <span className="h-2 w-2 rounded-full bg-gray-300 animate-bounce [animation-delay:150ms]" />
                    <span className="h-2 w-2 rounded-full bg-gray-300 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-100 bg-white p-4">
        {/* Attachment previews */}
        {(imageFiles.length > 0 || documentFile) && (
          <div className="flex flex-wrap gap-2 mb-3">
            {imageFiles.map((file, i) => (
              <div key={i} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt={t("tutor.chat.attachmentAlt", { index: i + 1 })}
                  className="h-16 w-16 rounded-lg object-cover border border-gray-200"
                />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -end-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={t("tutor.chat.removeImage", { index: i + 1 })}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {documentFile && (
              <div className="relative group">
                <Badge
                  variant="outline"
                  className="h-16 px-3 flex items-center gap-2 border-gray-200"
                >
                  <FileUp className="h-4 w-4 text-gray-500" />
                  <span className="text-xs max-w-24 truncate">
                    {documentFile.name}
                  </span>
                </Badge>
                <button
                  onClick={removeDocument}
                  className="absolute -top-1.5 -end-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={t("tutor.chat.removeDocument")}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Daily message limit reached banner */}
        {isLimitReached && !isTokenBudgetExceeded && (
          <div
            className="mb-3 p-3 rounded-lg bg-slate-100 flex items-center gap-2"
            role="alert"
          >
            <Info className="h-4 w-4 text-gray-500 shrink-0" />
            <p className="text-sm text-gray-500 font-medium">
              {t("tutor.chat.limitReached")}
            </p>
          </div>
        )}

        {/* Token budget exceeded banner */}
        {isTokenBudgetExceeded && (
          <div
            className="mb-3 p-3 rounded-lg bg-red-50 flex items-center gap-2"
            role="alert"
          >
            <AlertTriangle className="h-4 w-4 text-red-700 shrink-0" />
            <p className="text-sm text-red-700 font-medium">
              {t("tutor.chat.tokenBudgetExceeded")}
            </p>
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2">
          {/* Attachment buttons */}
          <div className="flex gap-1 shrink-0 pb-1">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              className="hidden"
              onChange={handleImageSelect}
              aria-label={t("tutor.chat.attachImages")}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => imageInputRef.current?.click()}
              disabled={
                isInputDisabled ||
                isUploading ||
                imageFiles.length >= MAX_IMAGES
              }
              aria-label={t("tutor.chat.attachImage")}
              className="text-gray-400 hover:text-gray-600"
            >
              <ImagePlus className="h-4 w-4" />
            </Button>

            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={handleDocSelect}
              aria-label={t("tutor.chat.attachDocument")}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => docInputRef.current?.click()}
              disabled={isInputDisabled || isUploading || documentFile !== null}
              aria-label={t("tutor.chat.attachDocument")}
              className="text-gray-400 hover:text-gray-600"
            >
              <FileUp className="h-4 w-4" />
            </Button>
          </div>

          {/* Text input */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isInputDisabled
                  ? t("tutor.chat.inputPlaceholderDisabled")
                  : t("tutor.chat.inputPlaceholder")
              }
              disabled={isInputDisabled}
              rows={1}
              className={cn(
                "resize-none min-h-[40px] max-h-[160px] pe-12 text-sm",
                isInputDisabled &&
                  "bg-slate-100 text-gray-500 cursor-not-allowed"
              )}
              aria-label={t("tutor.chat.messageInput")}
            />
            {/* Character counter */}
            {charCount > MAX_MESSAGE_LENGTH * 0.8 && (
              <span
                className={cn(
                  "absolute bottom-2 end-12 text-[10px]",
                  isOverLimit ? "text-red-500 font-bold" : "text-gray-400"
                )}
              >
                {charCount}/{MAX_MESSAGE_LENGTH}
              </span>
            )}
          </div>

          {/* Send button */}
          <Button
            onClick={() => void handleSend()}
            disabled={!canSend}
            size="icon"
            className="shrink-0 bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95 transition-transform duration-100 disabled:opacity-50"
            aria-label={t("tutor.chat.sendMessage")}
          >
            {isSending || isStreaming || isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
export type { ChatPanelProps };
