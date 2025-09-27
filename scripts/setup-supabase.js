#!/usr/bin/env node

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
  console.log(`📡 Connecting to Supabase: ${supabaseUrl}`)

  for (const userData of DEMO_USERS) {
    try {
      console.log(`\n👤 Creating ${userData.role}: ${userData.email}`)

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
        if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
          console.log(`✅ ${userData.role} user already exists`)
          continue
        } else {
          console.error(`❌ Error creating ${userData.role}:`, authError.message)
          continue
        }
      }

      if (authData?.user) {
        console.log(`✅ Created ${userData.role} user: ${userData.email}`)
        console.log(`   User ID: ${authData.user.id}`)
      }

    } catch (error) {
      console.error(`❌ Error seeding ${userData.role}:`, error.message || error)
    }
  }

  console.log('\n🎉 Demo user seeding completed!')
  console.log('\n📋 Demo Login Credentials:')
  console.log('━'.repeat(50))
  DEMO_USERS.forEach(user => {
    console.log(`${user.role.toUpperCase().padEnd(12)} | ${user.email.padEnd(25)} | ${user.password}`)
  })
  console.log('━'.repeat(50))
  console.log('\n🚀 Start the app with: npm run dev:supabase')
  console.log('🌐 Then visit the app and click the demo login buttons!')
}

// Run the seeding
seedDemoUsers()
  .then(() => {
    console.log('\n✨ All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Seeding failed:', error)
    process.exit(1)
  })