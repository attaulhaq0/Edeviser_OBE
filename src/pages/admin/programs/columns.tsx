import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ArrowUpDown, MoreHorizontal, Pencil, UserCheck, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Program } from '@/types/app';

// ─── Column factory — accepts onEdit and onDeactivate callbacks ─────────────

export const createColumns = (
  onEdit: (id: string) => void,
  onDeactivate: (program: Program) => void,
): ColumnDef<Program>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Name
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue('name')}</span>
    ),
  },
  {
    accessorKey: 'code',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Code
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: 'coordinator_id',
    header: 'Coordinator',
    cell: ({ row }) => {
      const coordinatorId = row.getValue('coordinator_id') as string | null;
      return (
        <Badge
          variant="outline"
          className={
            coordinatorId
              ? 'bg-blue-50 text-blue-600 border-blue-200'
              : 'bg-gray-50 text-gray-500 border-gray-200'
          }
        >
          {coordinatorId ? 'Assigned' : 'Unassigned'}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'is_active',
    header: 'Status',
    cell: ({ row }) => {
      const isActive = row.getValue('is_active') as boolean;
      return (
        <Badge
          variant="outline"
          className={
            isActive
              ? 'bg-green-50 text-green-600 border-green-200'
              : 'bg-red-50 text-red-600 border-red-200'
          }
        >
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) => {
      const date = row.getValue('created_at') as string;
      return (
        <span className="text-gray-500">
          {format(new Date(date), 'MMM d, yyyy')}
        </span>
      );
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const isActive = row.original.is_active;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(row.original.id)}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {isActive ? (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDeactivate(row.original)}
              >
                <UserX className="h-4 w-4" />
                Deactivate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled>
                <UserCheck className="h-4 w-4" />
                Reactivate
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
