import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,      // ne pas stocker de session dans localStorage
    autoRefreshToken: false,    // pas de refresh token
    detectSessionInUrl: false,  // pas de session dans l'URL
  }
})