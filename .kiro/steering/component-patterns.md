---
inclusion: always
---

# Edeviser Component Patterns

## Page Skeletons

Every page in the platform follows one of these patterns. Use the matching skeleton as a starting point.

### List Page Pattern
Used for: User List, Program List, Course List, ILO/PLO/CLO List, Assignment List, etc.

```typescript
// src/pages/{role}/{Entity}ListPage.tsx
import { useSearchParams } from 'react-router-dom';
import { parseAsString, useQueryState } from 'nuqs';
import { columns } from './columns';
import { DataTable } from '@/components/shared/DataTable';
import { useEntityList } from '@/hooks/useEntity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';

const EntityListPage = () => {
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
  const { data, isLoading } = useEntityList({ search });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Entities</h1>
        <Button className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95">
          <Plus className="h-4 w-4" /> Add Entity
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} />
    </div>
  );
};

export default EntityListPage;
```

Key rules:
- Always use `nuqs` for URL-persisted search/filter state
- Always use TanStack Table via a shared `DataTable` component
- One gradient CTA button max per page header
- Loading state handled by `isLoading` from TanStack Query

### Form Page Pattern
Used for: Create/Edit User, Program, Course, ILO, PLO, CLO, Assignment, etc.

```typescript
// src/pages/{role}/{Entity}Form.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEntitySchema, type CreateEntityInput } from '@/lib/schemas';
import { useCreateEntity } from '@/hooks/useEntity';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const EntityForm = () => {
  const form = useForm<CreateEntityInput>({
    resolver: zodResolver(createEntitySchema),
    defaultValues: { name: '' },
  });
  const mutation = useCreateEntity();

  const onSubmit = (data: CreateEntityInput) => {
    mutation.mutate(data, {
      onSuccess: () => toast.success('Entity created'),
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        </form>
      </Form>
    </Card>
  );
};

export default EntityForm;
```

Key rules:
- Always use React Hook Form + Zod resolver
- Always use Shadcn Form components (FormField, FormItem, FormLabel, FormControl, FormMessage)
- Always use Sonner for success/error toasts
- Loading state: Loader2 spinner in submit button
- Card wrapper: `bg-white border-0 shadow-md rounded-xl`

### Dashboard Page Pattern
Used for: Admin Dashboard, Coordinator Dashboard, Teacher Dashboard, Student Dashboard

```typescript
// src/pages/{role}/Dashboard.tsx
import { Card } from '@/components/ui/card';
import { useKPIData } from '@/hooks/useKPIData';
import { Users, BookOpen, TrendingUp, AlertTriangle } from 'lucide-react';

const KPICard = ({ icon: Icon, label, value, trend }: KPICardProps) => (
  <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">{label}</p>
        <p className="text-2xl font-black mt-1">{value}</p>
      </div>
      <div className="p-2 rounded-lg bg-blue-50 group-hover:scale-110 transition-transform">
        <Icon className="h-5 w-5 text-blue-600" />
      </div>
    </div>
  </Card>
);

const Dashboard = () => {
  const { data } = useKPIData();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={Users} label="Total Users" value={data?.totalUsers ?? 0} />
        <KPICard icon={BookOpen} label="Active Courses" value={data?.activeCourses ?? 0} />
        <KPICard icon={TrendingUp} label="Avg Attainment" value={`${data?.avgAttainment ?? 0}%`} />
        <KPICard icon={AlertTriangle} label="At Risk" value={data?.atRiskCount ?? 0} />
      </div>

      {/* Content sections below */}
    </div>
  );
};

export default Dashboard;
```

Key rules:
- KPI row: `grid grid-cols-2 md:grid-cols-4 gap-4`
- KPI cards: `group` hover with icon scale transition
- Metric label: `text-[10px] font-black tracking-widest uppercase`
- KPI value: `text-2xl font-black`
- Section gap: `space-y-6`

### Layout Pattern (Sidebar)
Used for: Admin, Coordinator, Teacher layouts

```typescript
// src/pages/{role}/{Role}Layout.tsx
import { Outlet, NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, BookOpen } from 'lucide-react';

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/programs', icon: BookOpen, label: 'Programs' },
];

const AdminLayout = () => (
  <div className="flex h-screen">
    <aside className="w-64 border-r border-slate-200 bg-white p-4 space-y-1">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-slate-50'
            )
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </aside>
    <main className="flex-1 overflow-auto p-6 bg-slate-50">
      <Outlet />
    </main>
  </div>
);

export default AdminLayout;
```

Key rules:
- Sidebar: `w-64` fixed width
- Active nav: `bg-blue-50 text-blue-600`
- Inactive nav: `text-gray-600 hover:bg-slate-50`
- Nav icons: `h-5 w-5`
- Main content: `bg-slate-50` background

## Shared Component Usage

### When to use what
| Need | Component | Location |
|------|-----------|----------|
| Data table with sort/filter/pagination | `DataTable` | `src/components/shared/DataTable.tsx` |
| Form with validation | Shadcn `Form` + Zod | `src/components/ui/form.tsx` |
| Modal/dialog | Shadcn `Dialog` | `src/components/ui/dialog.tsx` |
| Side panel | Shadcn `Sheet` | `src/components/ui/sheet.tsx` |
| Dropdown actions | Shadcn `DropdownMenu` | `src/components/ui/dropdown-menu.tsx` |
| Toast notifications | `toast()` from Sonner | `import { toast } from 'sonner'` |
| Tabs | Shadcn `Tabs` (pill style) | `src/components/ui/tabs.tsx` |
| Badges/tags | Shadcn `Badge` | `src/components/ui/badge.tsx` |
| Loading spinner | `Loader2` from Lucide | `import { Loader2 } from 'lucide-react'` |
| Empty state | Custom `EmptyState` | `src/components/shared/EmptyState.tsx` |
| Error boundary | Custom `ErrorBoundary` | `src/components/shared/ErrorBoundary.tsx` |
| Shimmer loading | Custom `Shimmer` | `src/components/shared/Shimmer.tsx` |

### Component-Level Loading (never full-page skeletons)
```typescript
// Use shimmer placeholders per component, not full-page loaders
{isLoading ? <Shimmer className="h-32 rounded-xl" /> : <ActualContent />}
```
