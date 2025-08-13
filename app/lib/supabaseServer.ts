import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client. Uses the service role key when available
// so that API routes can read data even if RLS policies are not yet configured.
// Falls back to the public anon key when the service role key is not provided.

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://cavysmnggzuubjyicptj.supabase.co'

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const keyToUse = supabaseServiceKey || supabaseAnonKey

export const supabaseServer = createClient(supabaseUrl, keyToUse)


