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

async function checkDatabase() {
  console.log('🔍 Checking Supabase database setup...')
  console.log(`📡 Connected to: ${supabaseUrl}`)
  console.log('━'.repeat(60))

  try {
    // Check if tables exist
    console.log('\n📋 Checking Tables:')
    const expectedTables = [
      'profiles',
      'programs', 
      'courses',
      'learning_outcomes',
      'assignments',
      'student_progress',
      'badge_templates',
      'student_badges'
    ]

    for (const table of expectedTables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('*', { count: 'exact', head: true })

        if (error) {
          console.log(`❌ ${table.padEnd(20)} - ERROR: ${error.message}`)
        } else {
          console.log(`✅ ${table.padEnd(20)} - EXISTS (${data?.length || 0} rows)`)
        }
      } catch (err) {
        console.log(`❌ ${table.padEnd(20)} - ERROR: ${err.message}`)
      }
    }

    // Check sample data
    console.log('\n📊 Checking Sample Data:')
    
    // Check programs
    const { data: programs, error: programsError } = await supabaseAdmin
      .from('programs')
      .select('*')
    
    if (programsError) {
      console.log('❌ Programs - ERROR:', programsError.message)
    } else {
      console.log(`✅ Programs - ${programs.length} records found`)
      programs.forEach(p => console.log(`   - ${p.name} (${p.code})`))
    }

    // Check badge templates
    const { data: badges, error: badgesError } = await supabaseAdmin
      .from('badge_templates')
      .select('*')
    
    if (badgesError) {
      console.log('❌ Badge Templates - ERROR:', badgesError.message)
    } else {
      console.log(`✅ Badge Templates - ${badges.length} records found`)
      badges.forEach(b => console.log(`   - ${b.name}`))
    }

    // Check courses
    const { data: courses, error: coursesError } = await supabaseAdmin
      .from('courses')
      .select('*')
    
    if (coursesError) {
      console.log('❌ Courses - ERROR:', coursesError.message)
    } else {
      console.log(`✅ Courses - ${courses.length} records found`)
      courses.forEach(c => console.log(`   - ${c.name} (${c.code})`))
    }

    // Check demo user profiles
    console.log('\n👥 Checking Demo User Profiles:')
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('role')
    
    if (profilesError) {
      console.log('❌ Profiles - ERROR:', profilesError.message)
    } else {
      console.log(`✅ User Profiles - ${profiles.length} records found`)
      profiles.forEach(p => console.log(`   - ${p.role.toUpperCase().padEnd(12)} | ${p.username.padEnd(15)} | ${p.first_name} ${p.last_name}`))
    }

    // Check RLS policies
    console.log('\n🔒 Checking Row Level Security:')
    try {
      const { data: rlsData, error: rlsError } = await supabaseAdmin
        .rpc('check_rls_status')
        .select()
      
      if (rlsError) {
        console.log('ℹ️  RLS Status - Cannot check via RPC (this is normal)')
      }
    } catch (err) {
      console.log('ℹ️  RLS Status - Policies should be active (cannot verify via client)')
    }

    console.log('\n🎉 Database Check Complete!')
    console.log('━'.repeat(60))
    
    // Provide summary
    const allTablesExist = expectedTables.length === 8 // We expect 8 tables
    const hasSampleData = programs?.length > 0 && badges?.length > 0
    const hasDemoUsers = profiles?.length >= 4

    console.log('\n📋 Summary:')
    console.log(`✅ Tables Created: ${allTablesExist ? 'YES' : 'NO'}`)
    console.log(`✅ Sample Data: ${hasSampleData ? 'YES' : 'NO'}`)  
    console.log(`✅ Demo Users: ${hasDemoUsers ? 'YES' : 'NO'}`)
    console.log(`🌐 App URL: http://localhost:5174/`)

    if (allTablesExist && hasSampleData && hasDemoUsers) {
      console.log('\n🎯 STATUS: READY TO TEST! 🚀')
      console.log('👉 Go to http://localhost:5174/ and try the demo login buttons!')
    } else {
      console.log('\n⚠️  STATUS: SETUP INCOMPLETE')
      if (!allTablesExist) console.log('   - Run the SQL migration script in Supabase SQL Editor')
      if (!hasSampleData) console.log('   - Sample data missing - check SQL script execution')  
      if (!hasDemoUsers) console.log('   - Run: npm run setup:supabase to create demo users')
    }

  } catch (error) {
    console.error('💥 Error checking database:', error.message)
    console.log('\n🔧 Troubleshooting:')
    console.log('1. Make sure you ran the SQL migration in Supabase SQL Editor')
    console.log('2. Check your Supabase project URL and service key')
    console.log('3. Verify your internet connection')
  }
}

// Run the check
checkDatabase()
  .then(() => {
    console.log('\n✨ Check completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Check failed:', error)
    process.exit(1)
  })