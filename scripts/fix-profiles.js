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

async function createMissingProfiles() {
  console.log('🔧 Creating missing demo user profiles...')

  try {
    // Get all users from Supabase Auth
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message)
      return
    }

    console.log(`📋 Found ${users.length} users in auth`)

    for (const user of users) {
      console.log(`\n👤 Processing user: ${user.email}`)

      // Check if profile already exists
      const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (existingProfile) {
        console.log(`✅ Profile already exists for ${user.email}`)
        continue
      }

      // Create profile
      const profileData = {
        id: user.id,
        username: user.user_metadata?.username || user.email.split('@')[0],
        email: user.email,
        first_name: user.user_metadata?.first_name || 'User',
        last_name: user.user_metadata?.last_name || 'Name',
        role: user.user_metadata?.role || 'student'
      }

      const { data: newProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert(profileData)
        .select()
        .single()

      if (profileError) {
        console.error(`❌ Error creating profile for ${user.email}:`, profileError.message)
      } else {
        console.log(`✅ Created profile: ${newProfile.role} - ${newProfile.first_name} ${newProfile.last_name}`)

        // Create student progress if user is a student
        if (profileData.role === 'student') {
          const { error: progressError } = await supabaseAdmin
            .from('student_progress')
            .insert({ student_id: user.id })

          if (progressError) {
            console.error(`❌ Error creating student progress:`, progressError.message)
          } else {
            console.log(`✅ Created student progress for ${user.email}`)
          }
        }
      }
    }

    console.log('\n🎉 Profile creation completed!')
    
    // Verify by checking profiles again
    const { data: allProfiles, error: verifyError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('role')

    if (verifyError) {
      console.error('❌ Error verifying profiles:', verifyError.message)
    } else {
      console.log(`\n✅ Total profiles now: ${allProfiles.length}`)
      allProfiles.forEach(p => {
        console.log(`   - ${p.role.toUpperCase().padEnd(12)} | ${p.username.padEnd(15)} | ${p.first_name} ${p.last_name}`)
      })
    }

  } catch (error) {
    console.error('💥 Error creating profiles:', error.message)
  }
}

// Run the fix
createMissingProfiles()
  .then(() => {
    console.log('\n✨ Fix completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Fix failed:', error)
    process.exit(1)
  })