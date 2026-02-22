import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ArrowUpDown, MoreHorizontal, Pencil, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BonusXPEvent } from '@/hooks/useBonusEvents';

// ─── Status derivation ──────────────────────────────────────────────────────

type EventStatus = 'Active' | 'Scheduled' | 'Ended' | 'Inactive';

const deriveStatus = (event: BonusXPEvent): EventStatus => {
  if (!event.is_active) return 'Inactive';
  const now = new Date();
  const start = new Date(event.starts_at);
  const end = new Date(event.ends_at);
  if (now >= start && now <= end) return 'Active';
  if (start > now) return 'Scheduled';
  return 'Ended';
};

const statusBadgeStyles: Record<EventStatus, string> = {
  Active: 'bg-green-50 text-green-600 border-green-200',
  Scheduled: 'bg-blue-50 text-blue-600 border-blue-200',
  Ended: 'bg-gray-50 text-gray-500 border-gray-200',
  Inactive: 'bg-red-50 text-red-600 border-red-200',
};

// ─── Column factory ─────────────────────────────────────────────────────────

export const createColumns = (
  onEdit: (event: BonusXPEvent) => void,
  onDeactivate: (event: BonusXPEvent) => void,
): ColumnDef<BonusXPEvent>[] => [
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
    accessorKey: 'multiplier',
    header: 'Multiplier',
    cell: ({ row }) => (
      <span className="font-medium text-amber-600">
        {row.getValue<number>('multiplier')}x
      </span>
    ),
  },
  {
    accessorKey: 'starts_at',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Start Date
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-gray-500">
        {format(new Date(row.getValue('starts_at')), 'MMM d, yyyy h:mm a')}
      </span>
    ),
  },
  {
    accessorKey: 'ends_at',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        End Date
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-gray-500">
        {format(new Date(row.getValue('ends_at')), 'MMM d, yyyy h:mm a')}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = deriveStatus(row.original);
      return (
        <Badge variant="outline" className={statusBadgeStyles[status]}>
          {status}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const event = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(event)}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {event.is_active && (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDeactivate(event)}
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

export { deriveStatus };
