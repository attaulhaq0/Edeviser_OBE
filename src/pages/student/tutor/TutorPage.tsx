// =============================================================================
// TutorPage — Main tutor page with sidebar + chat layout
// =============================================================================

import { useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import {
  useTutorConversations,
  useCreateConversation,
  useDeleteConversation,
} from "@/hooks/useTutorConversations";
import {
  useTutorMessages,
  useSendMessage,
  useRateMessage,
} from "@/hooks/useTutorMessages";
import { useTutorUsage } from "@/hooks/useTutorUsage";
import { useUpdateConversationAutonomy } from "@/hooks/useUpdateConversationAutonomy";
import { mapTutorError, type TutorUiState } from "@/lib/tutorStatus";
import ChatPanel from "@/pages/student/tutor/ChatPanel";
import TutorStatePanel from "@/pages/student/tutor/TutorStatePanel";
import ConversationSidebar from "@/pages/student/tutor/ConversationSidebar";
import PersonaSelector from "@/pages/student/tutor/PersonaSelector";
import type { TutorPersona, SourceCitation } from "@/lib/tutorSchemas";

const TutorPage = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation("ai");

  // Query params for contextual entry
  const courseIdParam = searchParams.get("courseId") ?? undefined;
  const cloIdsParam =
    searchParams.get("cloIds")?.split(",").filter(Boolean) ?? undefined;

  // State
  const [persona, setPersona] = useState<TutorPersona>("socratic_guide");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPersonaPicker, setShowPersonaPicker] = useState(!conversationId);
  // Backend-derived tutor availability state. `ready` keeps the live chat
  // surface; any failure signal is mapped via `mapTutorError` to a distinct
  // panel (R4.2, R4.3, R4.4) with a guaranteed `error` fallback (R4.2a).
  const [tutorState, setTutorState] = useState<TutorUiState>({ kind: "ready" });

  // Hooks
  const { data: conversations = [], isLoading: isLoadingConversations } =
    useTutorConversations(courseIdParam);
  const { data: messages = [], isLoading: isLoadingMessages } =
    useTutorMessages(conversationId ?? "");
  const { data: usage } = useTutorUsage();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const sendMessage = useSendMessage();
  const rateMessage = useRateMessage();
  const updateAutonomy = useUpdateConversationAutonomy();

  // Derive persona from active conversation
  const activeConversation = conversationId
    ? conversations.find((c) => c.id === conversationId)
    : undefined;

  // Sync persona from active conversation when it changes
  const derivedPersona = activeConversation?.persona ?? persona;
  const isNewConversation = !conversationId;
  const shouldShowPersonaPicker = isNewConversation && showPersonaPicker;

  // Derive autonomy override from active conversation
  const derivedAutonomyOverride =
    (activeConversation?.autonomy_override as "L1" | "L3" | null) ?? null;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleNewConversation = useCallback(() => {
    setShowPersonaPicker(true);
    navigate("/student/tutor");
    setSidebarOpen(false);
  }, [navigate]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      navigate(`/student/tutor/${id}`);
      setSidebarOpen(false);
      setShowPersonaPicker(false);
    },
    [navigate]
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      deleteConversation.mutate(id, {
        onSuccess: () => {
          if (conversationId === id) {
            navigate("/student/tutor");
          }
        },
      });
    },
    [deleteConversation, conversationId, navigate]
  );

  const handleSendMessage = useCallback(
    (input: {
      message: string;
      imageUrls?: string[];
      documentUrl?: string;
      onToken: (token: string) => void;
      onCitations: (citations: SourceCitation[]) => void;
      onDone: (data: { message_id: string; tokens_used: number }) => void;
    }) => {
      // Optimistically assume the tutor is reachable; a failure signal will
      // flip this to a distinct state via `mapTutorError`.
      setTutorState({ kind: "ready" });

      const handleErrorSignal = (signal: {
        code: string;
        message: string;
        httpStatus?: number;
        networkError?: boolean;
      }) => {
        setTutorState(mapTutorError(signal));
      };

      // If no active conversation, create one first
      if (!conversationId) {
        createConversation.mutate(
          {
            course_id: courseIdParam,
            persona: derivedPersona,
            clo_scope: cloIdsParam,
          },
          {
            onSuccess: (newConversation) => {
              navigate(`/student/tutor/${newConversation.id}`, {
                replace: true,
              });
              setShowPersonaPicker(false);

              sendMessage.mutate({
                input: {
                  conversation_id: newConversation.id,
                  course_id: courseIdParam,
                  message: input.message,
                  persona: derivedPersona,
                  image_urls: input.imageUrls,
                  document_url: input.documentUrl,
                  clo_scope: cloIdsParam,
                },
                onToken: input.onToken,
                onCitations: input.onCitations,
                onDone: input.onDone,
                onErrorSignal: handleErrorSignal,
              });
            },
            onError: () => {
              // Creating the conversation failed before any message could be
              // sent — treat as an unavailable backend rather than a silent
              // failure (R4.2).
              setTutorState({ kind: "unavailable" });
            },
          }
        );
      } else {
        sendMessage.mutate({
          input: {
            conversation_id: conversationId,
            message: input.message,
            persona: derivedPersona,
            image_urls: input.imageUrls,
            document_url: input.documentUrl,
          },
          onToken: input.onToken,
          onCitations: input.onCitations,
          onDone: input.onDone,
          onErrorSignal: handleErrorSignal,
        });
      }
    },
    [
      conversationId,
      courseIdParam,
      cloIdsParam,
      derivedPersona,
      createConversation,
      sendMessage,
      navigate,
    ]
  );

  const handleRateMessage = useCallback(
    (variables: {
      messageId: string;
      conversationId: string;
      rating: "thumbs_up" | "thumbs_down";
    }) => {
      rateMessage.mutate(variables);
    },
    [rateMessage]
  );

  const handlePersonaChange = useCallback((newPersona: TutorPersona) => {
    setPersona(newPersona);
  }, []);

  // Dismiss the persona picker to reveal the chat surface so the student can
  // begin chatting. The selected persona is held in state and flows through
  // `derivedPersona` into both the chat and the lazily-created conversation, so
  // no message needs to be sent first. Without this, the picker had no path
  // forward (its options only set the persona), leaving "new conversation" with
  // no way to actually open the chat.
  const handleStartChatting = useCallback(() => {
    setShowPersonaPicker(false);
  }, []);

  // Dismiss a recoverable tutor state so the student can try again.
  const handleRetryTutor = useCallback(() => {
    setTutorState({ kind: "ready" });
  }, []);

  const handleAutonomyChange = useCallback(
    (level: "L1" | "L3" | null) => {
      if (!conversationId) return;

      // Typed update of the conversation's autonomy_override. The hook
      // invalidates tutor-conversation queries on success and surfaces any
      // failure via a Sonner toast, so failed operations are never silently
      // discarded (R28.1, R28.3).
      updateAutonomy.mutate({ conversationId, level });
    },
    [conversationId, updateAutonomy]
  );

  // ─── Sidebar Content ──────────────────────────────────────────────────────

  const sidebarContent = (
    <ConversationSidebar
      conversations={conversations}
      isLoading={isLoadingConversations}
      activeConversationId={conversationId}
      onSelectConversation={handleSelectConversation}
      onNewConversation={handleNewConversation}
      onDeleteConversation={handleDeleteConversation}
      isDeleting={deleteConversation.isPending}
    />
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-8rem)] -m-6 bg-white rounded-xl overflow-hidden shadow-md border border-gray-100">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-72 border-e border-gray-100 bg-gray-50/50 flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0" showCloseButton={false}>
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header with hamburger */}
        <div className="md:hidden flex items-center gap-2 px-4 py-2 border-b border-gray-100">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(true)}
            aria-label={t("tutor.page.openConversations")}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-sm font-semibold text-gray-800">
            {t("tutor.page.title")}
          </span>
        </div>

        {/* Persona picker for new conversations */}
        {shouldShowPersonaPicker ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="max-w-sm w-full space-y-6">
              <div className="text-center">
                <div className="mx-auto p-4 rounded-2xl bg-gradient-to-br from-teal-50 to-blue-50 w-fit mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600">
                    <Bot className="h-8 w-8 text-white" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  {t("tutor.page.newConversationTitle")}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {t("tutor.page.newConversationSubtitle")}
                </p>
              </div>

              <PersonaSelector
                selectedPersona={persona}
                onSelect={handlePersonaChange}
                variant="full"
              />

              <Button
                className="w-full bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95"
                onClick={handleStartChatting}
              >
                {t("tutor.page.startChatting")}
              </Button>

              <p className="text-xs text-gray-400 text-center">
                {t("tutor.page.personaHint")}
              </p>
            </div>
          </div>
        ) : (
          // The chat area is wrapped in an ErrorBoundary so the guaranteed
          // fallback error display renders even if tutor-state detection or the
          // chat itself throws (R4.2a).
          <ErrorBoundary
            fallback={
              <div className="flex-1 flex items-center justify-center p-6">
                <TutorStatePanel
                  state={{
                    kind: "error",
                    message: "",
                  }}
                />
              </div>
            }
          >
            {tutorState.kind !== "ready" ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <TutorStatePanel
                  state={tutorState}
                  onRetry={handleRetryTutor}
                />
              </div>
            ) : (
              <ChatPanel
                messages={messages}
                isLoadingMessages={isLoadingMessages}
                conversationId={conversationId}
                courseId={courseIdParam}
                persona={derivedPersona}
                onPersonaChange={handlePersonaChange}
                onSendMessage={handleSendMessage}
                onRateMessage={handleRateMessage}
                isSending={
                  sendMessage.isPending || createConversation.isPending
                }
                isRatingPending={rateMessage.isPending}
                usage={usage}
                autonomyOverride={derivedAutonomyOverride}
                onAutonomyChange={handleAutonomyChange}
              />
            )}
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
};

export default TutorPage;
