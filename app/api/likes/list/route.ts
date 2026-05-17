// app/api/likes/list/route.ts
import { NextResponse } from 'next/server'
import { admin } from '@/lib/supabase-admin'
import { getProfileIdFromCookies } from '@/lib/tg'

export async function GET(req: Request) {
  try {
    const pid = getProfileIdFromCookies(req)
    if (!pid) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200)

    // через вьюху mini_liked_products (если создал)
    const { data, error } = await admin
      .from('mini_liked_products')
      .select('product_id, title, price, brand, images, liked_at')
      .eq('profile_id', pid)
      .order('liked_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return NextResponse.json({ ok: true, items: data || [] })
  } catch (e: any) {
    console.error('[likes/list]', e)
    return NextResponse.json({ ok: false, error: 'SERVER_ERROR' }, { status: 500 })
  }
}
