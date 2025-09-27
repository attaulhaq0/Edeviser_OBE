import { AuthProvider, useAuth } from './hooks/useSupabaseAuth'
import SupabaseAuthPage from './pages/supabase-auth-page'
import Dashboard from './pages/supabase-dashboard'
import { Loader2 } from 'lucide-react'

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <SupabaseAuthPage />
  }

  return <Dashboard />
}

function SupabaseApp() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default SupabaseApp