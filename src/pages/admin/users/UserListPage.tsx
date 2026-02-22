import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseAsString, useQueryState } from 'nuqs';
import { toast } from 'sonner';
import { createColumns } from './columns';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useUsers, useSoftDeleteUser } from '@/hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter, Upload } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Profile } from '@/types/app';

const ROLE_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'All Roles', value: '' },
  { label: 'Admin', value: 'admin' },
  { label: 'Coordinator', value: 'coordinator' },
  { label: 'Teacher', value: 'teacher' },
  { label: 'Student', value: 'student' },
  { label: 'Parent', value: 'parent' },
];

const UserListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
  const [role, setRole] = useQueryState('role', parseAsString.withDefault(''));
  const [userToDeactivate, setUserToDeactivate] = useState<Profile | null>(null);

  const { data, isLoading } = useUsers({
    search: search || undefined,
    role: role || undefined,
  });

  const softDeleteMutation = useSoftDeleteUser();

  const columns = createColumns(
    (id) => navigate(`/admin/users/${id}/edit`),
    (user) => setUserToDeactivate(user),
  );

  const activeRoleLabel =
    ROLE_OPTIONS.find((o) => o.value === role)?.label ?? 'All Roles';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/users/import')}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button
            className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
            onClick={() => navigate('/admin/users/new')}
          >
            <Plus className="h-4 w-4" /> Add User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value || null)}
            className="pl-9"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4" />
              {activeRoleLabel}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {ROLE_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setRole(option.value || null)}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} />

      {/* Deactivate Confirmation Dialog */}
      <ConfirmDialog
        open={!!userToDeactivate}
        onOpenChange={() => setUserToDeactivate(null)}
        title="Deactivate User"
        description={`Are you sure you want to deactivate ${userToDeactivate?.full_name}? They will lose access to the platform.`}
        variant="destructive"
        confirmLabel="Deactivate"
        isPending={softDeleteMutation.isPending}
        onConfirm={() => {
          if (!userToDeactivate) return;
          softDeleteMutation.mutate(userToDeactivate.id, {
            onSuccess: () => {
              toast.success(`${userToDeactivate.full_name} has been deactivated`);
              setUserToDeactivate(null);
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

export default UserListPage;
