// =============================================================================
// ConversationSidebar — Past conversations list with delete
// =============================================================================

import { useState } from 'react';
import { Plus, Trash2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cn } from '@/lib/utils';
import type { TutorConversation } from '@/lib/tutorSchemas';

interface ConversationSidebarProps {
  conversations: TutorConversation[];
  isLoading: boolean;
  activeConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  isDeleting?: boolean;
}

const truncatePreview = (text: string | null, maxLength = 60): string => {
  if (!text) return 'New conversation';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
};

const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const ConversationSidebar = ({
  conversations,
  isLoading,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isDeleting = false,
}: ConversationSidebarProps) => {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      onDeleteConversation(deleteTarget);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <Button
          onClick={onNewConversation}
          className="w-full bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95 transition-transform duration-100"
        >
          <Plus className="h-4 w-4" />
          New Conversation
        </Button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto" role="list" aria-label="Past conversations">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg animate-shimmer" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-6 text-center">
            <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No conversations yet</p>
            <p className="text-xs text-gray-400 mt-1">Start a new conversation to get help</p>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {conversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;

              return (
                <button
                  key={conversation.id}
                  className={cn(
                    'group flex items-start gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-colors w-full text-start',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                  onClick={() => onSelectConversation(conversation.id)}
                  aria-label={`Conversation: ${truncatePreview(conversation.title)}`}
                >
                  <MessageSquare
                    className={cn(
                      'h-4 w-4 mt-0.5 shrink-0',
                      isActive ? 'text-blue-500' : 'text-gray-400'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {truncatePreview(conversation.title)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-400">
                        {formatRelativeTime(conversation.updated_at)}
                      </span>
                      {conversation.message_count > 0 && (
                        <span className="text-[10px] text-gray-400">
                          · {conversation.message_count} msg{conversation.message_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(conversation.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete conversation"
        description="This will permanently delete this conversation and all its messages. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isPending={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default ConversationSidebar;
export type { ConversationSidebarProps };
