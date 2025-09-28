import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://farydblfbtxtzwjbpsuk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcnlkYmxmYnR4dHp3amJwc3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDUwNzcsImV4cCI6MjA3NDU4MTA3N30.75Du-puJXGT4CxJAi_kc61AFj6HYj3hbZ09Yek8iSMo'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testDemoLogin() {
  console.log('🧪 Testing demo login...')
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@edeviser.demo',
      password: 'admin123'
    })
    
    if (error) {
      console.error('❌ Login failed:', error.message)
      return
    }
    
    console.log('✅ Login successful!')
    console.log('User ID:', data.user?.id)
    console.log('Email:', data.user?.email)
    console.log('Metadata:', data.user?.user_metadata)
    
    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()
    
    if (profileError) {
      console.error('❌ Profile fetch failed:', profileError.message)
    } else {
      console.log('👤 Profile:', profile)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testDemoLogin()