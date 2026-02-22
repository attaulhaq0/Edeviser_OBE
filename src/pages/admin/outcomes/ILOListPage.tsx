import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import { createColumns } from './columns';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useILOs, useDeleteILO, useReorderILOs } from '@/hooks/useILOs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import Shimmer from '@/components/shared/Shimmer';
import {
  Plus,
  GripVertical,
  ArrowUpDown,
  Check,
  X,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import type { LearningOutcome } from '@/types/app';

// ─── Soft limit for ILOs per institution (Req 12.4) ─────────────────────────
const ILO_SOFT_LIMIT = 30;

// ─── Sortable Row ───────────────────────────────────────────────────────────

interface SortableRowProps {
  ilo: LearningOutcome;
  index: number;
}

const SortableRow = ({ ilo, index }: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ilo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow-sm"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-gray-400 hover:text-gray-600"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="w-8 text-sm font-medium text-gray-500">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{ilo.title}</p>
        {ilo.description && (
          <p className="text-xs text-gray-500 truncate">{ilo.description}</p>
        )}
      </div>
      <Badge
        variant="outline"
        className={
          ilo.is_active
            ? 'bg-green-50 text-green-600 border-green-200'
            : 'bg-red-50 text-red-600 border-red-200'
        }
      >
        {ilo.is_active ? 'Active' : 'Inactive'}
      </Badge>
      <span className="text-xs text-gray-400">
        {format(new Date(ilo.created_at), 'MMM d, yyyy')}
      </span>
    </div>
  );
};

// ─── ILO List Page ──────────────────────────────────────────────────────────

const ILOListPage = () => {
  const navigate = useNavigate();
  const [isDragMode, setIsDragMode] = useState(false);
  const [localOrder, setLocalOrder] = useState<LearningOutcome[] | null>(null);
  const [iloToDelete, setIloToDelete] = useState<LearningOutcome | null>(null);

  const { data: ilos, isLoading } = useILOs();
  const deleteMutation = useDeleteILO();
  const reorderMutation = useReorderILOs();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const displayItems = localOrder ?? ilos ?? [];
  const isAtLimit = displayItems.length >= ILO_SOFT_LIMIT;

  // Enter drag mode — snapshot current order for local reordering
  const enterDragMode = useCallback(() => {
    setLocalOrder([...(ilos ?? [])]);
    setIsDragMode(true);
  }, [ilos]);

  // Cancel drag mode — discard local changes
  const cancelDragMode = useCallback(() => {
    setLocalOrder(null);
    setIsDragMode(false);
  }, []);

  // Save reordered items
  const saveOrder = useCallback(() => {
    if (!localOrder) return;
    const items = localOrder.map((ilo, idx) => ({
      id: ilo.id,
      sort_order: idx,
    }));
    reorderMutation.mutate(
      { items },
      {
        onSuccess: () => {
          toast.success('ILO order saved');
          setLocalOrder(null);
          setIsDragMode(false);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }, [localOrder, reorderMutation]);

  // Handle drag end — reorder local state
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !localOrder) return;

      const oldIndex = localOrder.findIndex((i) => i.id === active.id);
      const newIndex = localOrder.findIndex((i) => i.id === over.id);
      setLocalOrder(arrayMove(localOrder, oldIndex, newIndex));
    },
    [localOrder],
  );

  const columns = createColumns(
    (id) => navigate(`/admin/outcomes/${id}/edit`),
    (ilo) => setIloToDelete(ilo),
    isDragMode,
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Institutional Learning Outcomes
        </h1>
        <div className="flex items-center gap-2">
          {!isDragMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={enterDragMode}
                disabled={isLoading || !ilos?.length}
              >
                <ArrowUpDown className="h-4 w-4" />
                Reorder
              </Button>
              <Button
                className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
                onClick={() => navigate('/admin/outcomes/new')}
              >
                <Plus className="h-4 w-4" /> Add ILO
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={cancelDragMode}
                disabled={reorderMutation.isPending}
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveOrder}
                disabled={reorderMutation.isPending}
                className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
              >
                {reorderMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Save Order
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Soft limit warning (Req 12.4) */}
      {isAtLimit && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            You have reached the recommended limit of {ILO_SOFT_LIMIT} ILOs.
            Consider consolidating outcomes before adding more.
          </span>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Shimmer key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : isDragMode ? (
        <Card className="bg-white border-0 shadow-md rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-3">
            Drag items to reorder, then click Save Order.
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={displayItems.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {displayItems.map((ilo, idx) => (
                  <SortableRow key={ilo.id} ilo={ilo} index={idx} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </Card>
      ) : (
        <DataTable columns={columns} data={displayItems} isLoading={false} />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!iloToDelete}
        onOpenChange={() => setIloToDelete(null)}
        title="Delete ILO"
        description={`Are you sure you want to delete "${iloToDelete?.title}"? This action cannot be undone. If this ILO has mapped PLOs, deletion will be blocked.`}
        variant="destructive"
        confirmLabel="Delete"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!iloToDelete) return;
          deleteMutation.mutate(iloToDelete.id, {
            onSuccess: () => {
              toast.success(`"${iloToDelete.title}" has been deleted`);
              setIloToDelete(null);
            },
            onError: (err) => {
              toast.error(err.message);
              setIloToDelete(null);
            },
          });
        }}
      />
    </div>
  );
};

export default ILOListPage;
