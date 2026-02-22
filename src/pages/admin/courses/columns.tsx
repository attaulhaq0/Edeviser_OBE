import { type ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, Pencil, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Course } from '@/types/app';

// ─── Column factory — accepts onEdit and onDeactivate callbacks ─────────────

export const createColumns = (
  onEdit: (course: Course) => void,
  onDeactivate: (course: Course) => void,
): ColumnDef<Course>[] => [
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
    header: 'Code',
  },
  {
    accessorKey: 'program_id',
    header: 'Program',
    cell: ({ row }) => (
      <span className="text-gray-500 truncate max-w-[120px] inline-block">
        {row.getValue('program_id') as string}
      </span>
    ),
  },
  {
    accessorKey: 'teacher_id',
    header: 'Teacher',
    cell: ({ row }) => (
      <span className="text-gray-500 truncate max-w-[120px] inline-block">
        {row.getValue('teacher_id') as string}
      </span>
    ),
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
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const course = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(course)}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {course.is_active && (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDeactivate(course)}
              >
                <XCircle className="h-4 w-4" />
                Deactivate
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
