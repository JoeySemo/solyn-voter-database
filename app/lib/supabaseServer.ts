import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client requiring the service role key.
// Ensures API routes can access data when RLS policies are not yet configured.

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL')
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey)

