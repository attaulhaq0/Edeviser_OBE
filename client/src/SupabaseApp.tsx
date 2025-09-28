import { useAuth, AuthProvider } from "@/hooks/useSupabaseAuth";
import { NavigationHeader } from "@/components/navigation/navigation-header";
import AdminDashboard from "@/components/dashboard/admin-dashboard";
import CoordinatorDashboard from "@/components/dashboard/coordinator-dashboard";
import TeacherDashboard from "@/components/dashboard/teacher-dashboard";
import StudentDashboard from "@/components/dashboard/student-dashboard";
import SupabaseAuthPage from "@/pages/supabase-auth-page";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

function AppContent() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-2 border-blue-200 mx-auto animate-pulse"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading E-Deviser...</p>
          <div className="mt-2 w-64 bg-gray-200 rounded-full h-1 mx-auto">
            <div className="bg-blue-600 h-1 rounded-full animate-pulse" style={{width: '60%'}}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <SupabaseAuthPage />;
  }

  const renderDashboard = () => {
    switch (profile.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'coordinator':
        return <CoordinatorDashboard />;
      case 'teacher':
        return <TeacherDashboard />;
      case 'student':
        return <StudentDashboard />;
      default:
        return (
          <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-800 mb-4">Invalid Role</h1>
              <p className="text-red-600">Your account role is not recognized. Please contact support.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <NavigationHeader />
      <main>
        {renderDashboard()}
      </main>
    </div>
  );
}

export default function SupabaseApp() {
  return (
    <TooltipProvider>
      <AuthProvider>
        <AppContent />
        <Toaster />
      </AuthProvider>
    </TooltipProvider>
  );
}