import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseAsString, useQueryState } from 'nuqs';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRubrics, useDeleteRubric, useCopyRubric } from '@/hooks/useRubrics';
import type { Rubric } from '@/hooks/useRubrics';
import { createColumns } from './columns';

const RubricListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
  const { data, isLoading } = useRubrics();
  const deleteMutation = useDeleteRubric();
  const copyMutation = useCopyRubric();

  const [deleteTarget, setDeleteTarget] = useState<Rubric | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter((r) => r.title.toLowerCase().includes(q));
  }, [data, search]);

  const columns = useMemo(
    () =>
      createColumns(
        (rubric) => navigate(`/teacher/rubrics/${rubric.id}/edit`),
        (rubric) => setDeleteTarget(rubric),
        (rubric) => {
          copyMutation.mutate(rubric.id, {
            onSuccess: () => toast.success('Rubric copied'),
            onError: (err) => toast.error(err.message),
          });
        },
      ),
    [navigate, copyMutation],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Rubrics</h1>
        <Button
          onClick={() => navigate('/teacher/rubrics/new')}
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
        >
          <Plus className="h-4 w-4" /> New Rubric
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search rubrics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Rubric"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success('Rubric deleted');
              setDeleteTarget(null);
            },
            onError: (err) => toast.error(err.message),
          });
        }}
      />
    </div>
  );
};

export default RubricListPage;
