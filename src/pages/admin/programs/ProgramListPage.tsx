import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseAsString, useQueryState } from 'nuqs';
import { toast } from 'sonner';
import { createColumns } from './columns';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { usePrograms, useSoftDeleteProgram } from '@/hooks/usePrograms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import type { Program } from '@/types/app';

const ProgramListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
  const [programToDeactivate, setProgramToDeactivate] = useState<Program | null>(null);

  const { data, isLoading } = usePrograms({
    search: search || undefined,
  });

  const softDeleteMutation = useSoftDeleteProgram();

  const columns = createColumns(
    (id) => navigate(`/admin/programs/${id}/edit`),
    (program) => setProgramToDeactivate(program),
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Programs</h1>
        <Button
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
          onClick={() => navigate('/admin/programs/new')}
        >
          <Plus className="h-4 w-4" /> Add Program
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value || null)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} />

      {/* Deactivate Confirmation Dialog */}
      <ConfirmDialog
        open={!!programToDeactivate}
        onOpenChange={() => setProgramToDeactivate(null)}
        title="Deactivate Program"
        description={`Are you sure you want to deactivate "${programToDeactivate?.name}"? This will not affect existing courses or outcomes.`}
        variant="destructive"
        confirmLabel="Deactivate"
        isPending={softDeleteMutation.isPending}
        onConfirm={() => {
          if (!programToDeactivate) return;
          softDeleteMutation.mutate(programToDeactivate.id, {
            onSuccess: () => {
              toast.success(`${programToDeactivate.name} has been deactivated`);
              setProgramToDeactivate(null);
            },
            onError: (err) => {
              toast.error(err.message);
            },
          });
        }}
      />
    </div>
  );
};

export default ProgramListPage;
