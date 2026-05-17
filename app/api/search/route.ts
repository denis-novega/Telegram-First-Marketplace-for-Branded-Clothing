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

    // поиск по продуктам через RPC
    const { data: products, error: productsError } = await supabase.rpc('products_search', {
      q,
      lim: limit,
      off: offset,
    })
    if (productsError) throw productsError

    // 🔍 дополнительный поиск по профилям
    const like = `%${q}%`
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, username, city, telegram_username, avatar_url')
      .or(`name.ilike.${like},username.ilike.${like},city.ilike.${like}`)
      .limit(10)

    if (profilesError) throw profilesError

    return NextResponse.json(
      {
        ok: true,
        items: {
          products: products ?? [],
          profiles: profiles ?? [],
        },
      },
      { headers: { 'cache-control': 'no-store' } }
    )
  } catch (e: any) {
    console.error('[search]', e)
    return NextResponse.json({ ok: false, error: e?.message || 'SERVER_ERROR' }, { status: 500 })
  }
}
