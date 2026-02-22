import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ArrowUpDown, GripVertical, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { LearningOutcome } from '@/types/app';

export const createColumns = (
  onEdit: (id: string) => void,
  onDelete: (plo: LearningOutcome) => void,
  isDragMode: boolean,
): ColumnDef<LearningOutcome>[] => {
  const cols: ColumnDef<LearningOutcome>[] = [];

  if (isDragMode) {
    cols.push({
      id: 'drag-handle',
      header: '',
      cell: () => (
        <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
      ),
      size: 40,
    });
  }

  cols.push(
    {
      accessorKey: 'sort_order',
      header: '#',
      cell: ({ row }) => (
        <span className="text-gray-500 text-sm font-medium">
          {(row.getValue('sort_order') as number) + 1}
        </span>
      ),
      size: 50,
    },
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Title
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue('title')}</span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => {
        const desc = row.getValue('description') as string | null;
        return (
          <span className="text-gray-500 text-sm line-clamp-1">
            {desc || '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'program_id',
      header: 'Program',
      cell: ({ row }) => {
        const programId = row.getValue('program_id') as string | null;
        return (
          <span className="text-gray-500 text-sm font-mono truncate max-w-[120px] inline-block">
            {programId ? programId.slice(0, 8) + '…' : '—'}
          </span>
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
      cell: ({ row }) => (
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
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(row.original)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  );

  return cols;
};
