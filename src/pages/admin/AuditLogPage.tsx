import { parseAsString, useQueryState } from 'nuqs';
import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { DataTable, ArrowUpDown } from '@/components/shared/DataTable';
import { useAuditLogs, type AuditLogRecord } from '@/hooks/useAuditLogs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';

// ─── Action color mapping ────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  soft_delete: 'bg-red-100 text-red-700',
  login: 'bg-purple-100 text-purple-700',
};

const getActionColor = (action: string): string =>
  ACTION_COLORS[action] ?? 'bg-gray-100 text-gray-700';

// ─── Filter options ──────────────────────────────────────────────────────────

const ACTION_OPTIONS = [
  { label: 'All Actions', value: '_all' },
  { label: 'Create', value: 'create' },
  { label: 'Update', value: 'update' },
  { label: 'Soft Delete', value: 'soft_delete' },
  { label: 'Login', value: 'login' },
];

const ENTITY_TYPE_OPTIONS = [
  { label: 'All Types', value: '_all' },
  { label: 'User', value: 'user' },
  { label: 'Program', value: 'program' },
  { label: 'ILO', value: 'ilo' },
  { label: 'PLO', value: 'plo' },
  { label: 'CLO', value: 'clo' },
  { label: 'Course', value: 'course' },
  { label: 'Assignment', value: 'assignment' },
  { label: 'Rubric', value: 'rubric' },
];

// ─── Truncate helper ─────────────────────────────────────────────────────────

const truncate = (str: string, len: number = 12): string =>
  str.length > len ? `${str.slice(0, len)}…` : str;

// ─── Column definitions ─────────────────────────────────────────────────────

const columns: ColumnDef<AuditLogRecord, unknown>[] = [
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Timestamp
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-gray-600 whitespace-nowrap">
        {format(new Date(row.getValue('created_at')), 'MMM d, yyyy HH:mm')}
      </span>
    ),
  },
  {
    accessorKey: 'action',
    header: 'Action',
    cell: ({ row }) => {
      const action = row.getValue<string>('action');
      return (
        <Badge className={getActionColor(action)} variant="secondary">
          {action}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'target_type',
    header: 'Entity Type',
    cell: ({ row }) => (
      <Badge variant="outline">{row.getValue<string>('target_type')}</Badge>
    ),
  },
  {
    accessorKey: 'target_id',
    header: 'Entity ID',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-gray-500" title={row.getValue<string>('target_id')}>
        {truncate(row.getValue<string>('target_id'))}
      </span>
    ),
  },
  {
    accessorKey: 'actor_id',
    header: 'Actor',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-gray-500" title={row.getValue<string>('actor_id')}>
        {truncate(row.getValue<string>('actor_id'))}
      </span>
    ),
  },
  {
    accessorKey: 'diff',
    header: 'Details',
    cell: ({ row }) => {
      const diff = row.getValue<Record<string, unknown> | null>('diff');
      if (!diff) return <span className="text-gray-400">—</span>;
      return (
        <pre className="text-xs text-gray-600 max-w-xs truncate" title={JSON.stringify(diff, null, 2)}>
          {JSON.stringify(diff)}
        </pre>
      );
    },
  },
];

// ─── Page component ──────────────────────────────────────────────────────────

const AuditLogPage = () => {
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
  const [action, setAction] = useQueryState('action', parseAsString.withDefault(''));
  const [entityType, setEntityType] = useQueryState('type', parseAsString.withDefault(''));

  const { data, isLoading } = useAuditLogs({
    search: search || undefined,
    action: action || undefined,
    entityType: entityType || undefined,
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search action, type, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value || null)}
            className="pl-9"
          />
        </div>

        <Select
          value={action || '_all'}
          onValueChange={(v) => setAction(v === '_all' ? null : v)}
        >
          <SelectTrigger className="w-[160px] bg-white">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={entityType || '_all'}
          onValueChange={(v) => setEntityType(v === '_all' ? null : v)}
        >
          <SelectTrigger className="w-[160px] bg-white">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} />
    </div>
  );
};

export default AuditLogPage;
