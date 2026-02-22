import { type ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Rubric } from '@/hooks/useRubrics';

export const createColumns = (
  onEdit: (rubric: Rubric) => void,
  onDelete: (rubric: Rubric) => void,
  onCopy: (rubric: Rubric) => void,
): ColumnDef<Rubric>[] => [
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
    accessorKey: 'clo_id',
    header: 'CLO',
    cell: ({ row }) => (
      <span className="text-gray-500 truncate max-w-[140px] inline-block">
        {row.getValue('clo_id') as string}
      </span>
    ),
  },
  {
    accessorKey: 'is_template',
    header: 'Type',
    cell: ({ row }) => {
      const isTemplate = row.getValue('is_template') as boolean;
      return (
        <Badge
          variant="outline"
          className={
            isTemplate
              ? 'bg-blue-50 text-blue-600 border-blue-200'
              : 'bg-gray-50 text-gray-600 border-gray-200'
          }
        >
          {isTemplate ? 'Template' : 'Rubric'}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const rubric = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(rubric)}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCopy(rubric)}>
              <Copy className="h-4 w-4" />
              Copy
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(rubric)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
