import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'
import type { User as SupabaseUser, Session, AuthError } from '@supabase/supabase-js'

type Profile = {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  role: 'admin' | 'coordinator' | 'teacher' | 'student'
  is_active: boolean
  profile_image: string | null
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: SupabaseUser | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, userData: {
    username: string
    firstName: string
    lastName: string
    role?: 'admin' | 'coordinator' | 'teacher' | 'student'
  }) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  signInWithDemo: (role: 'admin' | 'coordinator' | 'teacher' | 'student') => Promise<{ error: AuthError | null }>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Set a shorter timeout to prevent long loading (2 seconds instead of 3)
    const loadingTimeout = setTimeout(() => {
      console.log('Loading timeout reached, setting loading to false')
      if (!isInitialized) {
        setLoading(false)
        setIsInitialized(true)
      }
    }, 2000) // 2 seconds timeout

    // Get initial session with faster timeout
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Session error:', error)
          setLoading(false)
          setIsInitialized(true)
          return
        }
        
        console.log('Initial session check:', session)
        setSession(session)
        setUser(session?.user ?? null)
        setIsInitialized(true)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setLoading(false)
        setIsInitialized(true)
      }
      clearTimeout(loadingTimeout)
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session)
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
      clearTimeout(loadingTimeout)
    })

    return () => {
      subscription.unsubscribe()
      clearTimeout(loadingTimeout)
    }
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId)
      
      // Set a timeout for profile fetch (2 seconds)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
        console.log('Profile fetch timeout, setting loading to false')
        setLoading(false)
      }, 2000)

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .single()

      clearTimeout(timeoutId)

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error)
        setLoading(false)
      } else if (data) {
        console.log('Profile found:', data)
        setProfile(data as Profile)
        setLoading(false)
      } else {
        console.log('No profile found for user')
        setLoading(false)
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Profile fetch aborted due to timeout')
      } else {
        console.error('Error fetching profile:', error)
      }
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      console.log('Attempting sign in for:', email)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('Sign in error:', error)
        setLoading(false)
      }
      // Don't set loading to false here - let the auth state change handle it
      return { error }
    } catch (error: any) {
      console.error('Sign in exception:', error)
      setLoading(false)
      return { error }
    }
  }

  const signUp = async (
    email: string, 
    password: string, 
    userData: {
      username: string
      firstName: string
      lastName: string
      role?: 'admin' | 'coordinator' | 'teacher' | 'student'
    }
  ) => {
    setLoading(true)
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: userData.username,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role || 'student'
        }
      }
    })

    setLoading(false)
    return { error }
  }

  const signOut = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    setLoading(false)
    return { error }
  }

  const signInWithDemo = async (role: 'admin' | 'coordinator' | 'teacher' | 'student') => {
    console.log('🔑 signInWithDemo called with role:', role)
    const demoCredentials = {
      admin: { email: 'admin@edeviser.demo', password: 'admin123' },
      coordinator: { email: 'coordinator@edeviser.demo', password: 'coord123' },
      teacher: { email: 'teacher@edeviser.demo', password: 'teacher123' },
      student: { email: 'student@edeviser.demo', password: 'student123' }
    }

    const { email, password } = demoCredentials[role]
    console.log('🔐 Demo credentials:', { email, password: '***' })
    const result = await signIn(email, password)
    console.log('📤 Demo signIn result:', result)
    return result
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') }

    try {
      // Use raw query to avoid type issues
      const { error } = await supabase.rpc('update_profile', {
        user_id: user.id,
        updates: updates
      })

      if (!error) {
        setProfile(prev => prev ? { ...prev, ...updates } : null)
      }

      return { error }
    } catch (err) {
      return { error: err as Error }
    }
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithDemo,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  
  // Add more detailed error information for debugging
  if (context === undefined) {
    console.error('useAuth called outside of AuthProvider. Current location:', new Error().stack)
    throw new Error('useAuth must be used within an AuthProvider. Make sure your component is wrapped with <AuthProvider>.</AuthProvider>')
  }
  
  return context
}