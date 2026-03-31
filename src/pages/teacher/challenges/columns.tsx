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
import type { Challenge } from '@/hooks/useChallenges';

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  active: 'bg-green-50 text-green-700 border-green-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

const typeLabels: Record<string, string> = {
  team: 'Team',
  course_wide: 'Course-Wide',
};

const metricLabels: Record<string, string> = {
  total_xp: 'Total XP',
  habits_completed: 'Habits',
  assignments_submitted: 'Assignments',
  quiz_score_avg: 'Quiz Avg',
};

export const createColumns = (
  onEdit: (challenge: Challenge) => void,
  onCancel: (challenge: Challenge) => void,
): ColumnDef<Challenge>[] => [
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
    cell: ({ row }) => <span className="font-medium">{row.getValue('title')}</span>,
  },
  {
    accessorKey: 'challenge_type',
    header: 'Type',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {typeLabels[row.getValue<string>('challenge_type')] ?? row.getValue('challenge_type')}
      </Badge>
    ),
  },
  {
    accessorKey: 'goal_metric',
    header: 'Metric',
    cell: ({ row }) => (
      <span className="text-sm text-gray-600">
        {metricLabels[row.getValue<string>('goal_metric')] ?? row.getValue('goal_metric')}
      </span>
    ),
  },
  {
    accessorKey: 'goal_target',
    header: 'Target',
    cell: ({ row }) => <span className="text-sm font-medium">{row.getValue('goal_target')}</span>,
  },
  {
    accessorKey: 'reward_type',
    header: 'Reward',
    cell: ({ row }) => {
      const c = row.original;
      return (
        <Badge className="text-xs bg-amber-50 text-amber-700 border-amber-200">
          {c.reward_type === 'xp_bonus' ? `+${c.reward_value} XP` : `Badge`}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'start_date',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Start
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-gray-500">
        {format(new Date(row.getValue<string>('start_date')), 'MMM d, yyyy')}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue<string>('status');
      return (
        <Badge variant="outline" className={statusStyles[status] ?? 'bg-gray-100'}>
          {status}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const challenge = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(challenge)}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {(challenge.status === 'draft' || challenge.status === 'active') && (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onCancel(challenge)}
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
