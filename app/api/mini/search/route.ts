// app/api/search/route.ts
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(url, anon, {
  auth: { persistSession: false },
})

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '24', 10), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)

    if (!q) {
      return NextResponse.json({ ok: false, error: 'EMPTY_QUERY' }, { status: 400 })
    }

    const like = `%${q}%`

    const { data, error } = await supabase
      .from('products')
      .select('id, title, price, brand, category, gender, size, condition, images, created_at')
      .or(`title.ilike.${like},description.ilike.${like},brand.ilike.${like}`)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ ok: true, items: data ?? [] }, { headers: { 'cache-control': 'no-store' } })
  } catch (e: any) {
    console.error('[search]', e)
    return NextResponse.json({ ok: false, error: e?.message || 'SERVER_ERROR' }, { status: 500 })
  }
}
