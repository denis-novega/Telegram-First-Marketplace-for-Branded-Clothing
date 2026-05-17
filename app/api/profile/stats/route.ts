// app/api/profile/stats/route.ts
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { admin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const c = await cookies()
    const pid = c.get('tg_pid')?.value // UUID профиля из куки
    if (!pid) {
      return NextResponse.json({ ok: false, error: 'NO_PROFILE' }, { status: 401 })
    }

    // 1) берём связанный user_id у профиля
    const { data: prof, error: pe } = await admin
      .from('profiles')
      .select('id,user_id')
      .eq('id', pid)
      .maybeSingle()

    if (pe || !prof) {
      return NextResponse.json({ ok: false, error: 'PROFILE_NOT_FOUND' }, { status: 404 })
    }

    // 2) опубликованные (products) — считаем по user_id
    let productsPublished = 0
    if (prof.user_id) {
      const { count: pubCount, error: pubErr } = await admin
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', prof.user_id)
      if (pubErr) {
        // логируем, но не падаем
        console.error('[profile/stats] products count error:', pubErr)
      }
      productsPublished = pubCount ?? 0
    }

    // 3) лайки товаров профилем — через RPC
    const { data: likesFn, error: likesErr } = await admin.rpc('count_product_likes_for_profile', {
      p_profile_id: pid,
    })
    if (likesErr) {
      console.error('[profile/stats] product likes rpc error:', likesErr)
    }
    const productLikes = Number(likesFn ?? 0)

    // (опционально) лайки профилей
    const { count: profileLikes, error: profLikesErr } = await admin
      .from('profile_likes')
      .select('id', { count: 'exact', head: true })
      .eq('liker_profile_id', pid)

    if (profLikesErr) {
      console.error('[profile/stats] profile likes count error:', profLikesErr)
    }

    // Возвращаем только нужные поля
    return NextResponse.json({
      ok: true,
      stats: {
        products_published: productsPublished,
        product_likes: productLikes,
        profile_likes: profileLikes ?? 0,
      },
    })
  } catch (e) {
    console.error('[profile/stats]', e)
    return NextResponse.json({ ok: false, error: 'SERVER_ERROR' }, { status: 500 })
  }
}

