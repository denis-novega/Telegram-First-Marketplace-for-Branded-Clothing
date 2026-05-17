// app/api/likes/toggle/route.ts
import { NextResponse } from 'next/server'
import { admin } from '@/lib/supabase-admin'
import { getProfileIdFromCookies } from '@/lib/tg'

export async function POST(req: Request) {
  try {
    const pid = getProfileIdFromCookies(req)
    if (!pid) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })

    const { product_id } = await req.json()
    if (!product_id) return NextResponse.json({ ok: false, error: 'NO_PRODUCT_ID' }, { status: 400 })

    // проверить, лайкал ли уже
    const { data: exists, error: selErr } = await admin
      .from('product_likes')
      .select('product_id')
      .eq('product_id', product_id)
      .eq('liker_user_id', pid)
      .maybeSingle()

    if (exists) {
      const { error: delErr } = await admin
        .from('product_likes')
        .delete()
        .eq('product_id', product_id)
        .eq('liker_user_id', pid)
      if (delErr) throw delErr
      return NextResponse.json({ ok: true, liked: false })
    } else {
      const { error: insErr } = await admin
        .from('product_likes')
        .insert({ product_id, liker_user_id: pid })
      if (insErr) throw insErr
      return NextResponse.json({ ok: true, liked: true })
    }
  } catch (e: any) {
    console.error('[likes/toggle]', e)
    return NextResponse.json({ ok: false, error: 'SERVER_ERROR' }, { status: 500 })
  }
}
