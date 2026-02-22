import { Outlet } from 'react-router-dom';

const TeacherLayout = () => (
  <div className="flex h-screen">
    <aside className="w-64 border-r border-slate-200 bg-white p-4">
      <h2 className="text-lg font-bold tracking-tight">Teacher</h2>
    </aside>
    <main className="flex-1 overflow-auto p-6 bg-slate-50">
      <Outlet />
    </main>
  </div>
);

export default TeacherLayout;
