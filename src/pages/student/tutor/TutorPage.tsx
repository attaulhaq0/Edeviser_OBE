import { useCallback, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import ChatPanel from '@/pages/student/tutor/ChatPanel';
import ConversationSidebar from '@/pages/student/tutor/ConversationSidebar';
import {
  useTutorConversations,
  useDeleteConversation,
} from '@/hooks/useTutorConversations';
import type { TutorPersona } from '@/lib/tutorSchemas';
import { toast } from 'sonner';

const TutorPage = () => {
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [persona, setPersona] = useState<TutorPersona>('socratic_guide');

  // Extract context from URL params (from contextual entry points)
  const courseId = searchParams.get('course_id') ?? undefined;
  const cloIds = searchParams.get('clo_ids')?.split(',').filter(Boolean) ?? undefined;

  const { data: conversations = [], isLoading: isLoadingConversations } =
    useTutorConversations(courseId);
  const deleteConversation = useDeleteConversation();

  const handleSelectConversation = useCallback(
    (id: string) => {
      navigate(`/student/tutor/${id}`);
      setSidebarOpen(false);
    },
    [navigate],
  );

  const handleNewConversation = useCallback(() => {
    // Navigate to tutor page without conversation ID to start fresh
    const params = new URLSearchParams();
    if (courseId) params.set('course_id', courseId);
    if (cloIds && cloIds.length > 0) params.set('clo_ids', cloIds.join(','));
    const qs = params.toString();
    navigate(`/student/tutor${qs ? `?${qs}` : ''}`);
    setSidebarOpen(false);
  }, [navigate, courseId, cloIds]);

  const handleDeleteConversation = useCallback(
    (id: string) => {
      deleteConversation.mutate(id, {
        onSuccess: () => {
          toast.success('Conversation deleted');
          if (conversationId === id) {
            navigate('/student/tutor');
          }
        },
        onError: (err) => toast.error(err.message),
      });
    },
    [deleteConversation, conversationId, navigate],
  );

  const handleConversationCreated = useCallback(
    (newId: string) => {
      navigate(`/student/tutor/${newId}`);
    },
    [navigate],
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] -m-6 bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      {/* Mobile sidebar toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 start-2 z-20 md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <div
        className={cn(
          'w-72 border-e border-slate-200 bg-white shrink-0 transition-transform duration-200',
          'absolute inset-y-0 start-0 z-10 md:relative md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={conversationId}
          onSelect={handleSelectConversation}
          onNew={handleNewConversation}
          onDelete={handleDeleteConversation}
          isLoading={isLoadingConversations}
          isDeleting={deleteConversation.isPending}
        />
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-[5] md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Chat panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatPanel
          conversationId={conversationId}
          courseId={courseId}
          cloScope={cloIds}
          persona={persona}
          onPersonaChange={setPersona}
          onConversationCreated={handleConversationCreated}
        />
      </div>
    </div>
  );
};

export default TutorPage;
