import { createClient } from '@supabase/supabase-js'
import { Database } from '../shared/supabase-types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://farydblfbtxtzwjbpsuk.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcnlkYmxmYnR4dHp3amJwc3VrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTAwNTA3NywiZXhwIjoyMDc0NTgxMDc3fQ.RGi5BtI2jLtRumyWeg5dBMrA5QPTPlBC5GMulnzeWro'

// Admin client with service role key for server-side operations
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})