import { useNavigate } from 'react-router-dom';
import { parseAsString, useQueryState } from 'nuqs';
import { createColumns } from './columns';
import { DataTable } from '@/components/shared/DataTable';
import { useUsers } from '@/hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { UserRole } from '@/types/app';

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

  const { data, isLoading } = useUsers({
    search: search || undefined,
    role: role || undefined,
  });

  const columns = createColumns((id) => navigate(`/admin/users/${id}/edit`));

  const activeRoleLabel =
    ROLE_OPTIONS.find((o) => o.value === role)?.label ?? 'All Roles';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <Button
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
          onClick={() => navigate('/admin/users/new')}
        >
          <Plus className="h-4 w-4" /> Add User
        </Button>
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
    </div>
  );
};

export default UserListPage;
