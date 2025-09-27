import { supabase } from '../lib/supabase'

// Demo user credentials for quick login
export const DEMO_CREDENTIALS = {
  admin: {
    email: 'admin@edeviser.demo',
    password: 'admin123',
    username: 'admin',
    firstName: 'System',
    lastName: 'Administrator',
    role: 'admin' as const
  },
  coordinator: {
    email: 'coordinator@edeviser.demo',
    password: 'coord123',
    username: 'coordinator',
    firstName: 'Program',
    lastName: 'Coordinator',
    role: 'coordinator' as const
  },
  teacher: {
    email: 'teacher@edeviser.demo',
    password: 'teacher123',
    username: 'teacher',
    firstName: 'Course',
    lastName: 'Teacher',
    role: 'teacher' as const
  },
  student: {
    email: 'student@edeviser.demo',
    password: 'student123',
    username: 'student',
    firstName: 'Demo',
    lastName: 'Student',
    role: 'student' as const
  }
} as const

export async function signInWithDemo(role: keyof typeof DEMO_CREDENTIALS) {
  const credentials = DEMO_CREDENTIALS[role]
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password
  })

  return { data, error }
}

export async function seedDemoUsers() {
  console.log('Seeding demo users...')
  
  for (const [role, userData] of Object.entries(DEMO_CREDENTIALS)) {
    try {
      // Try to sign up the user
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            username: userData.username,
            first_name: userData.firstName,
            last_name: userData.lastName,
            role: userData.role
          }
        }
      })

      if (error && error.message !== 'User already registered') {
        console.error(`Error creating ${role} user:`, error)
      } else {
        console.log(`✓ Demo ${role} user ready`)
      }
    } catch (err) {
      console.error(`Error seeding ${role}:`, err)
    }
  }
}