import { Outlet, NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, BookOpen, Target, ScrollText } from 'lucide-react';

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/programs', icon: BookOpen, label: 'Programs' },
  { to: '/admin/outcomes', icon: Target, label: 'ILOs' },
  { to: '/admin/audit-log', icon: ScrollText, label: 'Audit Log' },
];

const AdminLayout = () => (
  <div className="flex h-screen">
    <aside className="w-64 border-r border-slate-200 bg-white p-4 space-y-1">
      <h2 className="text-lg font-bold tracking-tight mb-4 px-3">Admin</h2>
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-600 hover:bg-slate-50',
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
