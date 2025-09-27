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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error)
      } else if (data) {
        setProfile(data as Profile)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setLoading(false)
    return { error }
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
    const demoCredentials = {
      admin: { email: 'admin@edeviser.demo', password: 'admin123' },
      coordinator: { email: 'coordinator@edeviser.demo', password: 'coord123' },
      teacher: { email: 'teacher@edeviser.demo', password: 'teacher123' },
      student: { email: 'student@edeviser.demo', password: 'student123' }
    }

    const { email, password } = demoCredentials[role]
    return await signIn(email, password)
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}