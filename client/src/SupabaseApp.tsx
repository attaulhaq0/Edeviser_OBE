import { AuthProvider, useAuth } from './hooks/useSupabaseAuth'
import SupabaseAuthPage from './pages/supabase-auth-page'
import { Loader2 } from 'lucide-react'
import CoordinatorDashboard from "@/components/dashboard/coordinator-dashboard";
import { StudentOnboardingWrapper } from "@/components/onboarding/student-onboarding-wrapper";
import TeacherDashboard from "@/components/dashboard/teacher-dashboard";
import AdminDashboard from "@/components/dashboard/admin-dashboard";
import { NavigationHeader } from "@/components/navigation/navigation-header";

function AppContent() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!user || !profile) {
    return <SupabaseAuthPage />
  }

  const renderDashboard = () => {
    switch (profile.role) {
      case "admin":
        return <AdminDashboard />;
      case "coordinator":
        return <CoordinatorDashboard />;
      case "teacher":
        return <TeacherDashboard />;
      case "student":
        return <StudentOnboardingWrapper />;
      default:
        return <div>Invalid role</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderDashboard()}
      </main>
    </div>
  )
}

function SupabaseApp() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default SupabaseApp