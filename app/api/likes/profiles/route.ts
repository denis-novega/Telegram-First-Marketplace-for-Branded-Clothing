// app/api/likes/profiles/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { admin } from '@/lib/supabase-admin'

export async function GET(req: Request) {
  const store = await cookies()
  const pid = store.get('tg_pid')?.value
  if (!pid) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })

  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 200)

  // Берём лайки и подтягиваем профили
  const { data: likes, error } = await admin
    .from('profile_likes')
    .select('liked_profile_id')
    .eq('profile_id', pid)
    .limit(limit)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const ids = (likes || []).map((l) => l.liked_profile_id).filter(Boolean)
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, items: [] })
  }

  const { data: profiles, error: perr } = await admin
    .from('profiles')
    .select('id, username, name, city, telegram_username, telegram_photo_url, is_verified')
    .in('id', ids)

  if (perr) {
    return NextResponse.json({ ok: false, error: perr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, items: profiles ?? [] })
}
