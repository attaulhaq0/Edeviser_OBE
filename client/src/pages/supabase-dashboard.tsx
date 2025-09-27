import { useAuth } from '../hooks/useSupabaseAuth'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { LogOut, User, Settings } from 'lucide-react'

export default function SupabaseDashboard() {
  const { user, profile, signOut } = useAuth()

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Loading...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">E-Deviser</h1>
              <Badge variant={
                profile.role === 'admin' ? 'destructive' :
                profile.role === 'coordinator' ? 'secondary' :
                profile.role === 'teacher' ? 'outline' : 'default'
              }>
                {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {profile.first_name} {profile.last_name}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {profile.first_name}!
          </h2>
          <p className="text-gray-600">
            You are logged in as {profile.role} with email {profile.email}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Profile Information
              </CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="font-medium">Username:</span> {profile.username}
              </div>
              <div>
                <span className="font-medium">Email:</span> {profile.email}
              </div>
              <div>
                <span className="font-medium">Name:</span> {profile.first_name} {profile.last_name}
              </div>
              <div>
                <span className="font-medium">Role:</span> 
                <Badge className="ml-2">{profile.role}</Badge>
              </div>
              <div>
                <span className="font-medium">Status:</span> 
                <Badge variant={profile.is_active ? "default" : "secondary"} className="ml-2">
                  {profile.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common tasks for your role</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {profile.role === 'admin' && (
                <>
                  <Button variant="outline" className="w-full justify-start">
                    Manage Users
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    System Settings
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    View Analytics
                  </Button>
                </>
              )}
              
              {profile.role === 'coordinator' && (
                <>
                  <Button variant="outline" className="w-full justify-start">
                    Manage Programs
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    View PLOs
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Generate Reports
                  </Button>
                </>
              )}
              
              {profile.role === 'teacher' && (
                <>
                  <Button variant="outline" className="w-full justify-start">
                    Manage Courses
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Create Assignments
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Grade Submissions
                  </Button>
                </>
              )}
              
              {profile.role === 'student' && (
                <>
                  <Button variant="outline" className="w-full justify-start">
                    View Courses
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Submit Assignments
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Track Progress
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Platform information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="font-medium">Database:</span>
                <Badge variant="default" className="ml-2">Supabase</Badge>
              </div>
              <div>
                <span className="font-medium">Authentication:</span>
                <Badge variant="default" className="ml-2">Supabase Auth</Badge>
              </div>
              <div>
                <span className="font-medium">User ID:</span>
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded ml-2">
                  {user.id}
                </code>
              </div>
              <div>
                <span className="font-medium">Account Created:</span>
                <span className="text-sm text-gray-600 ml-2">
                  {new Date(profile.created_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Migration Notice */}
        <Card className="mt-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">🎉 Migration Complete!</CardTitle>
            <CardDescription className="text-blue-700">
              Your E-Deviser LXP has been successfully migrated to Supabase
            </CardDescription>
          </CardHeader>
          <CardContent className="text-blue-800">
            <ul className="list-disc list-inside space-y-1">
              <li>Database migrated from Neon to Supabase PostgreSQL</li>
              <li>Authentication migrated from Passport.js to Supabase Auth</li>
              <li>Demo users created for quick testing</li>
              <li>Real-time capabilities enabled</li>
              <li>Row Level Security (RLS) policies implemented</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}