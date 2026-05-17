// lib/supabase-admin.ts (SERVER ONLY)
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // <-- ОБЯЗАТЕЛЕН

export const admin = createClient(url, serviceKey, {
  auth: { persistSession: false },
})
