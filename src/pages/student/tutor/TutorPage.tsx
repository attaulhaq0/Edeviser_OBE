// =============================================================================
// TutorPage — Main tutor page with sidebar + chat layout
// =============================================================================

import { useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, Menu, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  useCreateHandoff,
  useHandoffContext,
  useStudentHandoffs,
} from "@/hooks/useTeacherHandoffs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
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
  // E2.F: AI-detected teacher-handoff suggestion awaiting student consent.
  const [pendingHandoff, setPendingHandoff] = useState<{
    reason: string;
    message: string;
  } | null>(null);
  const [handoffConsent, setHandoffConsent] = useState(false);

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
  const createHandoff = useCreateHandoff();
  const handoffContext = useHandoffContext(courseIdParam);
  const { user } = useAuth();
  const { data: studentHandoffs } = useStudentHandoffs(user?.id);

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

  const handleHandoffSuggestion = useCallback(
    (suggestion: { reason: string; message: string }) => {
      // E2.F: the backend detected a handoff trigger — surface the consent
      // dialog. Never auto-create a request; consent is mandatory (R28.4).
      setHandoffConsent(false);
      setPendingHandoff(suggestion);
    },
    []
  );

  const handleConfirmHandoff = useCallback(() => {
    if (!pendingHandoff || !conversationId || !user?.id) return;
    const context = handoffContext.data;
    if (!context) {
      toast.error(t("tutor.handoff.unresolvable"));
      return;
    }
    // The backend emits a known trigger-reason enum; anything unexpected
    // degrades to the generic low-confidence reason rather than failing.
    const reason =
      pendingHandoff.reason === "repeated_question"
        ? "repeated_question"
        : pendingHandoff.reason === "low_satisfaction"
        ? "low_satisfaction"
        : "low_rag_confidence";
    const summary =
      messages.length > 0
        ? messages
            .slice(-5)
            .map(
              (m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`
            )
            .join("\n")
        : pendingHandoff.message;
    createHandoff.mutate(
      {
        conversation_id: conversationId,
        student_id: user.id,
        teacher_id: context.teacher_id,
        institution_id: context.institution_id,
        course_id: context.course_id,
        conversation_summary: summary,
        suggested_intervention: pendingHandoff.message,
        trigger_reason: reason,
        student_consent: true,
      },
      {
        onSuccess: () => {
          setPendingHandoff(null);
          setHandoffConsent(false);
          toast.success(t("tutor.handoff.created"));
        },
        onError: () => toast.error(t("tutor.handoff.failed")),
      }
    );
  }, [
    pendingHandoff,
    conversationId,
    user,
    handoffContext.data,
    messages,
    createHandoff,
    t,
  ]);

  const handleSendMessage = useCallback(
    (input: {
      message: string;
      imageUrls?: string[];
      documentUrl?: string;
      onToken: (token: string) => void;
      onCitations: (citations: SourceCitation[]) => void;
      onDone: (data: { message_id: string; tokens_used: number }) => void;
    }) => {
      if ((input.imageUrls?.length ?? 0) > 0 || input.documentUrl) {
        setTutorState({
          kind: "error",
          message: t("tutor.chat.errors.attachmentsUnavailable"),
        });
        return;
      }
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
                onHandoffSuggestion: handleHandoffSuggestion,
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
          onHandoffSuggestion: handleHandoffSuggestion,
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
      handleHandoffSuggestion,
      navigate,
      t,
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
                  <div className="p-3 rounded-xl bg-[linear-gradient(93.65deg,#14b8a6_5.37%,#0382bd_78.89%)]">
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
                variant="tactile"
                className="w-full"
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

      {/* E2.F: student handoff history — closes the resolve loop by showing
          each request's status and the teacher's response. */}
      {(studentHandoffs?.length ?? 0) > 0 && (
        <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-800">
            {t("tutor.handoff.historyTitle")}
          </h2>
          <ul className="mt-3 space-y-3">
            {studentHandoffs!.map((h) => (
              <li
                key={h.id}
                className="rounded-lg border border-gray-100 bg-gray-50/60 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-gray-600">
                    {new Date(h.created_at).toLocaleDateString()}
                  </span>
                  <Badge
                    variant={
                      h.status === "pending"
                        ? "outline"
                        : h.status === "resolved"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {t(`tutor.handoff.status_${h.status}`)}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-gray-700">
                  {h.conversation_summary}
                </p>
                {h.teacher_response && (
                  <p className="mt-2 rounded-md bg-white border border-gray-100 p-2 text-sm text-gray-800">
                    <span className="font-medium">
                      {t("tutor.handoff.teacherResponse")}{" "}
                    </span>
                    {h.teacher_response}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* E2.F: student consent dialog for an AI-detected handoff (R28.4).
          The request is only created after explicit opt-in. */}
      <Dialog
        open={!!pendingHandoff}
        onOpenChange={(open) => {
          if (!open) {
            setPendingHandoff(null);
            setHandoffConsent(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tutor.handoff.title")}</DialogTitle>
            <DialogDescription>
              {t("tutor.handoff.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-gray-50 border border-gray-100 p-3 text-sm text-gray-700 whitespace-pre-wrap">
            {pendingHandoff?.message}
          </div>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <Checkbox
              checked={handoffConsent}
              onCheckedChange={(checked) => setHandoffConsent(checked === true)}
              className="mt-0.5"
            />
            <span>{t("tutor.handoff.consentLabel")}</span>
          </label>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingHandoff(null);
                setHandoffConsent(false);
              }}
            >
              {t("tutor.handoff.cancel")}
            </Button>
            <Button
              onClick={handleConfirmHandoff}
              disabled={!handoffConsent || createHandoff.isPending}
            >
              {createHandoff.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {t("tutor.handoff.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TutorPage;
