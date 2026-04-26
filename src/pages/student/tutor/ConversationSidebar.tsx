import { Plus, Trash2, MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useState } from 'react';
import type { TutorConversation } from '@/lib/tutorSchemas';

interface ConversationSidebarProps {
  conversations: TutorConversation[];
  activeConversationId?: string;
  onSelect: (conversationId: string) => void;
  onNew: () => void;
  onDelete: (conversationId: string) => void;
  isLoading?: boolean;
  isDeleting?: boolean;
}

const ConversationSidebar = ({
  conversations,
  activeConversationId,
  onSelect,
  onNew,
  onDelete,
  isLoading = false,
  isDeleting = false,
}: ConversationSidebarProps) => {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* New conversation button */}
      <div className="p-3 border-b border-slate-200">
        <Button
          className="w-full bg-gradient-to-r from-teal-500 to-blue-600 text-white hover:from-teal-600 hover:to-blue-700 active:scale-95"
          size="sm"
          onClick={onNew}
        >
          <Plus className="h-4 w-4" />
          New Conversation
        </Button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-auto p-2 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 px-4">
            <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No conversations yet</p>
            <p className="text-xs text-gray-400 mt-1">Start a new conversation to get help</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const preview = conv.title ?? 'New conversation';
            const truncatedPreview =
              preview.length > 60 ? `${preview.slice(0, 60)}...` : preview;

            return (
              <div
                key={conv.id}
                className={cn(
                  'group flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-slate-50',
                )}
                onClick={() => onSelect(conv.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(conv.id);
                  }
                }}
              >
                <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{truncatedPreview}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {conv.message_count} messages
                  </p>
                </div>
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 hover:text-red-500 transition-all shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(conv.id);
                  }}
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Conversation"
        description="This will permanently delete this conversation and all its messages. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        isPending={isDeleting}
        variant="destructive"
      />
    </div>
  );
};

export default ConversationSidebar;
