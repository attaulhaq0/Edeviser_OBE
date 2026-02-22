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
import { parseAsString, useQueryState } from 'nuqs';
import { createColumns } from './columns';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { usePLOs, useDeletePLO, useReorderPLOs } from '@/hooks/usePLOs';
import { usePrograms } from '@/hooks/usePrograms';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Shimmer from '@/components/shared/Shimmer';
import {
  Plus,
  GripVertical,
  ArrowUpDown,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import type { LearningOutcome } from '@/types/app';

// ─── Sortable Row ───────────────────────────────────────────────────────────

interface SortableRowProps {
  plo: LearningOutcome;
  index: number;
}

const SortableRow = ({ plo, index }: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: plo.id });

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
        <p className="text-sm font-medium truncate">{plo.title}</p>
        {plo.description && (
          <p className="text-xs text-gray-500 truncate">{plo.description}</p>
        )}
      </div>
      <Badge
        variant="outline"
        className={
          plo.is_active
            ? 'bg-green-50 text-green-600 border-green-200'
            : 'bg-red-50 text-red-600 border-red-200'
        }
      >
        {plo.is_active ? 'Active' : 'Inactive'}
      </Badge>
    </div>
  );
};

// ─── PLO List Page ──────────────────────────────────────────────────────────

const PLOListPage = () => {
  const navigate = useNavigate();
  const [isDragMode, setIsDragMode] = useState(false);
  const [localOrder, setLocalOrder] = useState<LearningOutcome[] | null>(null);
  const [ploToDelete, setPloToDelete] = useState<LearningOutcome | null>(null);
  const [programFilter, setProgramFilter] = useQueryState(
    'program',
    parseAsString.withDefault(''),
  );

  const { data: programs, isLoading: programsLoading } = usePrograms();
  const { data: plos, isLoading } = usePLOs(programFilter || undefined);
  const deleteMutation = useDeletePLO();
  const reorderMutation = useReorderPLOs();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const displayItems = localOrder ?? plos ?? [];

  const enterDragMode = useCallback(() => {
    setLocalOrder([...(plos ?? [])]);
    setIsDragMode(true);
  }, [plos]);

  const cancelDragMode = useCallback(() => {
    setLocalOrder(null);
    setIsDragMode(false);
  }, []);

  const saveOrder = useCallback(() => {
    if (!localOrder) return;
    const items = localOrder.map((plo, idx) => ({
      id: plo.id,
      sort_order: idx,
    }));
    reorderMutation.mutate(
      { items },
      {
        onSuccess: () => {
          toast.success('PLO order saved');
          setLocalOrder(null);
          setIsDragMode(false);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }, [localOrder, reorderMutation]);

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
    (id) => navigate(`/coordinator/plos/${id}/edit`),
    (plo) => setPloToDelete(plo),
    isDragMode,
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Program Learning Outcomes
        </h1>
        <div className="flex items-center gap-2">
          {!isDragMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={enterDragMode}
                disabled={isLoading || !plos?.length}
              >
                <ArrowUpDown className="h-4 w-4" />
                Reorder
              </Button>
              <Button
                className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
                onClick={() => navigate('/coordinator/plos/new')}
              >
                <Plus className="h-4 w-4" /> Add PLO
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

      {/* Program Filter */}
      <div className="flex items-center gap-4">
        <Select
          value={programFilter}
          onValueChange={(val) => setProgramFilter(val === 'all' ? '' : val)}
          disabled={programsLoading}
        >
          <SelectTrigger className="w-[260px] bg-white">
            <SelectValue placeholder="Filter by program" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {(programs ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
                {displayItems.map((plo, idx) => (
                  <SortableRow key={plo.id} plo={plo} index={idx} />
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
        open={!!ploToDelete}
        onOpenChange={() => setPloToDelete(null)}
        title="Delete PLO"
        description={`Are you sure you want to delete "${ploToDelete?.title}"? This action cannot be undone. If this PLO has mapped CLOs, deletion will be blocked.`}
        variant="destructive"
        confirmLabel="Delete"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!ploToDelete) return;
          deleteMutation.mutate(ploToDelete.id, {
            onSuccess: () => {
              toast.success(`"${ploToDelete.title}" has been deleted`);
              setPloToDelete(null);
            },
            onError: (err) => {
              toast.error(err.message);
              setPloToDelete(null);
            },
          });
        }}
      />
    </div>
  );
};

export default PLOListPage;
