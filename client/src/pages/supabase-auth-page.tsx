import { useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Alert, AlertDescription } from '../components/ui/alert'
import { useAuth } from '../hooks/useSupabaseAuth'
import { DEMO_CREDENTIALS } from '../lib/demo-users'
import { Loader2, User, Users, GraduationCap, Shield } from 'lucide-react'

export default function SupabaseAuthPage() {
  const { signIn, signUp, signInWithDemo, loading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  })

  // Register form state
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    firstName: '',
    lastName: '',
    role: 'student' as 'admin' | 'coordinator' | 'teacher' | 'student'
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const { error } = await signIn(loginData.email, loginData.password)
    
    if (error) {
      setError(error.message)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (registerData.password !== registerData.confirmPassword) {
      setError("Passwords don't match")
      return
    }

    const { error } = await signUp(registerData.email, registerData.password, {
      username: registerData.username,
      firstName: registerData.firstName,
      lastName: registerData.lastName,
      role: registerData.role
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess('Account created successfully! Please check your email to verify your account.')
      setRegisterData({
        email: '',
        password: '',
        confirmPassword: '',
        username: '',
        firstName: '',
        lastName: '',
        role: 'student'
      })
    }
  }

  const handleDemoLogin = async (role: keyof typeof DEMO_CREDENTIALS) => {
    console.log('🎯 Demo login started for role:', role)
    setError(null)
    setSuccess(null)

    try {
      console.log('🔐 Calling signInWithDemo...')
      const { error } = await signInWithDemo(role)
      console.log('📋 signInWithDemo result:', { error })
      
      if (error) {
        console.error('❌ Demo login failed:', error)
        setError(`Demo login failed: ${error.message}`)
      } else {
        console.log('✅ Demo login successful!')
        setSuccess(`Demo login successful! Redirecting to ${role} dashboard...`)
      }
    } catch (err) {
      console.error('❌ Demo login exception:', err)
      setError(`Demo login error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4" />
      case 'coordinator': return <Users className="w-4 h-4" />
      case 'teacher': return <GraduationCap className="w-4 h-4" />
      default: return <User className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background with Theme Colors */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-200"></div>
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-32 h-32 bg-blue-200/30 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-1/3 right-20 w-48 h-48 bg-indigo-300/40 rounded-full blur-2xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-cyan-200/50 rounded-full blur-xl animate-pulse delay-2000"></div>
        <div className="absolute bottom-10 right-10 w-24 h-24 bg-blue-300/60 rounded-full blur-lg animate-pulse delay-3000"></div>
      </div>
      
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Logo with enhanced styling */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-xl mb-4">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              E-Deviser
            </h1>
            <p className="text-gray-600 font-medium">OBE Learning Management System</p>
          </div>

          {/* Auth Forms */}
          <Card className="bg-white border-0 shadow-2xl">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-blue-50">
                <TabsTrigger 
                  value="login" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger 
                  value="register"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                >
                  Register
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-gray-800">Welcome Back</CardTitle>
                  <CardDescription className="text-gray-600">Sign in to your account to continue</CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                        placeholder="Enter your password"
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 shadow-lg" 
                      disabled={loading}
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Sign In
                    </Button>
                  </CardFooter>
                  
                  {/* Compact Demo Buttons - Separated Below */}
                  <div className="px-6 pb-6">
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-xs text-gray-500 text-center mb-3">Quick Demo Access:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(DEMO_CREDENTIALS).map(([role, credentials]) => (
                          <Button
                            key={role}
                            variant="outline"
                            size="sm"
                            className="h-10 px-3 text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 flex items-center justify-center"
                            onClick={() => handleDemoLogin(role as keyof typeof DEMO_CREDENTIALS)}
                            disabled={loading}
                            title={`${credentials.firstName} ${credentials.lastName}`}
                          >
                            <div className="flex items-center gap-1.5">
                              {loading ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                getRoleIcon(role)
                              )}
                              <span className="capitalize font-medium">{role}</span>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-gray-800">Create Account</CardTitle>
                  <CardDescription className="text-gray-600">Join E-Deviser to start learning</CardDescription>
                </CardHeader>
                <form onSubmit={handleRegister}>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-gray-700 font-medium">First Name</Label>
                        <Input
                          id="firstName"
                          value={registerData.firstName}
                          onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                          className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-gray-700 font-medium">Last Name</Label>
                        <Input
                          id="lastName"
                          value={registerData.lastName}
                          onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                          className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-gray-700 font-medium">Username</Label>
                      <Input
                        id="username"
                        value={registerData.username}
                        onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                        className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="text-gray-700 font-medium">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password" className="text-gray-700 font-medium">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                        className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-gray-700 font-medium">Role</Label>
                      <select
                        id="role"
                        className="w-full px-3 py-2 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-blue-500/20 focus:outline-none"
                        value={registerData.role}
                        onChange={(e) => setRegisterData({ ...registerData, role: e.target.value as any })}
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="coordinator">Coordinator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 shadow-lg" 
                      disabled={loading}
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Create Account
                    </Button>
                  </CardFooter>
                </form>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  )
}