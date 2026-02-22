import { type ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { LearningOutcome, BloomsLevel } from '@/types/app';

const bloomsBadgeStyles: Record<string, string> = {
  Remembering: 'bg-purple-500 text-white',
  Understanding: 'bg-blue-500 text-white',
  Applying: 'bg-green-500 text-white',
  Analyzing: 'bg-yellow-500 text-gray-900',
  Evaluating: 'bg-orange-500 text-white',
  Creating: 'bg-red-500 text-white',
};

const formatBloomsLevel = (level: string | null): string => {
  if (!level) return '—';
  return level.charAt(0).toUpperCase() + level.slice(1);
};

export const createColumns = (
  onEdit: (id: string) => void,
  onDelete: (clo: LearningOutcome) => void,
): ColumnDef<LearningOutcome>[] => [
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
    accessorKey: 'blooms_level',
    header: "Bloom's Level",
    cell: ({ row }) => {
      const raw = row.getValue('blooms_level') as BloomsLevel | null;
      const label = formatBloomsLevel(raw);
      const styleKey = label;
      const badgeClass = bloomsBadgeStyles[styleKey] ?? 'bg-gray-200 text-gray-700';

      if (!raw) {
        return <span className="text-gray-400 text-sm">—</span>;
      }

      return (
        <Badge className={cn('text-xs font-bold tracking-wide', badgeClass)}>
          {label}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'course_id',
    header: 'Course',
    cell: ({ row }) => {
      const courseId = row.getValue('course_id') as string | null;
      return (
        <span className="text-gray-500 text-sm font-mono truncate max-w-[120px] inline-block">
          {courseId ? courseId.slice(0, 8) + '…' : '—'}
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
];
