import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://farydblfbtxtzwjbpsuk.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcnlkYmxmYnR4dHp3amJwc3VrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTAwNTA3NywiZXhwIjoyMDc0NTgxMDc3fQ.RGi5BtI2jLtRumyWeg5dBMrA5QPTPlBC5GMulnzeWro'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const DEMO_USERS = [
  {
    email: 'admin@edeviser.demo',
    password: 'admin123',
    username: 'admin',
    first_name: 'System',
    last_name: 'Administrator',
    role: 'admin'
  },
  {
    email: 'coordinator@edeviser.demo',
    password: 'coord123',
    username: 'coordinator',
    first_name: 'Program',
    last_name: 'Coordinator',
    role: 'coordinator'
  },
  {
    email: 'teacher@edeviser.demo',
    password: 'teacher123',
    username: 'teacher',
    first_name: 'Course',
    last_name: 'Teacher',
    role: 'teacher'
  },
  {
    email: 'student@edeviser.demo',
    password: 'student123',
    username: 'student',
    first_name: 'Demo',
    last_name: 'Student',
    role: 'student'
  }
]

async function seedDemoUsers() {
  console.log('🌱 Starting demo user seeding...')

  for (const userData of DEMO_USERS) {
    try {
      console.log(`Creating ${userData.role}: ${userData.email}`)

      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          username: userData.username,
          first_name: userData.first_name,
          last_name: userData.last_name,
          role: userData.role
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`✓ ${userData.role} user already exists`)
          continue
        } else {
          console.error(`❌ Error creating ${userData.role}:`, authError.message)
          continue
        }
      }

      console.log(`✓ Created ${userData.role} user: ${userData.email}`)

    } catch (error) {
      console.error(`❌ Error seeding ${userData.role}:`, error)
    }
  }

  console.log('🎉 Demo user seeding completed!')
  console.log('\n📋 Demo Credentials:')
  DEMO_USERS.forEach(user => {
    console.log(`${user.role.toUpperCase()}: ${user.email} / ${user.password}`)
  })
}

// Run if this file is executed directly
if (require.main === module) {
  seedDemoUsers()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seeding failed:', error)
      process.exit(1)
    })
}

export { seedDemoUsers }