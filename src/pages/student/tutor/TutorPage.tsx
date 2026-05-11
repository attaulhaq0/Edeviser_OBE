// =============================================================================
// TutorPage — Main tutor page with sidebar + chat layout
// =============================================================================

import { useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Menu, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useQueryClient } from "@tanstack/react-query";
import ChatPanel from "@/pages/student/tutor/ChatPanel";
import ConversationSidebar from "@/pages/student/tutor/ConversationSidebar";
import PersonaSelector from "@/pages/student/tutor/PersonaSelector";
import type { TutorPersona, SourceCitation } from "@/lib/tutorSchemas";

const TutorPage = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Query params for contextual entry
  const courseIdParam = searchParams.get("courseId") ?? undefined;
  const cloIdsParam =
    searchParams.get("cloIds")?.split(",").filter(Boolean) ?? undefined;

  // State
  const [persona, setPersona] = useState<TutorPersona>("socratic_guide");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPersonaPicker, setShowPersonaPicker] = useState(!conversationId);

  // Hooks
  const queryClient = useQueryClient();
  const { data: conversations = [], isLoading: isLoadingConversations } =
    useTutorConversations(courseIdParam);
  const { data: messages = [], isLoading: isLoadingMessages } =
    useTutorMessages(conversationId ?? "");
  const { data: usage } = useTutorUsage();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const sendMessage = useSendMessage();
  const rateMessage = useRateMessage();

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
              });
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

  const handleAutonomyChange = useCallback(
    (level: "L1" | "L3" | null) => {
      if (!conversationId) return;

      // Optimistically update the conversation's autonomy_override via Supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("tutor_conversations")
        .update({ autonomy_override: level })
        .eq("id", conversationId)
        .then(() => {
          // Invalidate conversations to reflect the change
          queryClient.invalidateQueries({
            queryKey: queryKeys.tutorConversations.lists(),
          });
        });
    },
    [conversationId, queryClient]
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
            aria-label="Open conversations"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-sm font-semibold text-gray-800">AI Tutor</span>
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
                  Start a new conversation
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Choose a tutoring style that works best for you
                </p>
              </div>

              <PersonaSelector
                selectedPersona={persona}
                onSelect={handlePersonaChange}
                variant="full"
              />

              <p className="text-xs text-gray-400 text-center">
                You can change the persona at any time during the conversation
              </p>
            </div>
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
            isSending={sendMessage.isPending || createConversation.isPending}
            isRatingPending={rateMessage.isPending}
            usage={usage}
            autonomyOverride={derivedAutonomyOverride}
            onAutonomyChange={handleAutonomyChange}
          />
        )}
      </div>
    </div>
  );
};

export default TutorPage;
