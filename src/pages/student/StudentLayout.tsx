import { Outlet } from 'react-router-dom';

const StudentLayout = () => (
  <div className="flex h-screen">
    <main className="flex-1 overflow-auto p-6 bg-slate-50">
      <Outlet />
    </main>
  </div>
);

export default StudentLayout;
