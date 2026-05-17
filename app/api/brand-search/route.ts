import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (!q) return NextResponse.json({ items: [] })

  const supabase = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data, error } = await supabase.rpc('brand_search', { q, lim: 8 })

  if (error) return NextResponse.json({ items: [], error: error.message }, { status: 400 })
  return NextResponse.json({ items: data ?? [] })
}
