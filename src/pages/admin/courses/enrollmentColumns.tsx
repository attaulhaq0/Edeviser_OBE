import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ArrowUpDown, MoreHorizontal, UserMinus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { EnrollmentWithProfile } from '@/hooks/useEnrollments';

const statusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-700 border-green-200',
  dropped: 'bg-red-100 text-red-700 border-red-200',
  completed: 'bg-blue-100 text-blue-700 border-blue-200',
};

export const createEnrollmentColumns = (
  onUnenroll: (enrollment: EnrollmentWithProfile) => void,
): ColumnDef<EnrollmentWithProfile>[] => [
  {
    id: 'student_name',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Student Name
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
    accessorFn: (row) => row.profiles?.full_name ?? 'Unknown',
    cell: ({ getValue }) => (
      <span className="font-medium">{getValue() as string}</span>
    ),
  },
  {
    id: 'email',
    header: 'Email',
    accessorFn: (row) => row.profiles?.email ?? '—',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return (
        <Badge variant="outline" className={statusStyles[status] ?? ''}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'enrolled_at',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Enrolled Date
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = row.getValue('enrolled_at') as string | null;
      if (!date) return '—';
      return format(new Date(date), 'MMM d, yyyy');
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const enrollment = row.original;
      if (enrollment.status !== 'active') return null;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onUnenroll(enrollment)}
            >
              <UserMinus className="h-4 w-4" />
              Unenroll
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
