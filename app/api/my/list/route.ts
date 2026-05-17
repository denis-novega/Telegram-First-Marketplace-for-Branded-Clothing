import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { admin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic' // чтобы не застаивалось в dev

export async function GET() {
  try {
    // 👇 ВАЖНО: сначала ждём cookies()
    const cookieStore = await cookies()
    const pid = cookieStore.get('tg_pid')?.value || ''
    if (!pid) {
      return NextResponse.json({ ok: false, error: 'not_logged_in' }, { status: 401 })
    }

    // маппим profile_id -> user_id (может быть null для Telegram-only)
    const { data: prof, error: e1 } = await admin
      .from('profiles')
      .select('user_id')
      .eq('id', pid)
      .maybeSingle()

    if (e1) {
      console.error('[my/list] profiles', e1)
      return NextResponse.json({ ok: false, error: 'db_profiles' }, { status: 500 })
    }

    const uid = prof?.user_id ?? null

    // ищем по ОБОИМ ключам: user_id ИЛИ profile_id
    let pubSel, pendSel
    if (uid) {
      pubSel = await admin
        .from('products')
        .select('id,title,price,images,brand,created_at,status,profile_id,user_id')
        .or(`user_id.eq.${uid},profile_id.eq.${pid}`)
        .order('created_at', { ascending: false })

      pendSel = await admin
        .from('pending_products')
        .select('id,title,price,images,brand,created_at,status,profile_id,user_id')
        .or(`user_id.eq.${uid},profile_id.eq.${pid}`)
        .order('created_at', { ascending: false })
    } else {
      // Telegram-only: фильтруем только по profile_id
      pubSel = await admin
        .from('products')
        .select('id,title,price,images,brand,created_at,status,profile_id,user_id')
        .eq('profile_id', pid)
        .order('created_at', { ascending: false })

      pendSel = await admin
        .from('pending_products')
        .select('id,title,price,images,brand,created_at,status,profile_id,user_id')
        .eq('profile_id', pid)
        .order('created_at', { ascending: false })
    }

    if (pubSel.error) console.error('[my/list] products', pubSel.error)
    if (pendSel.error) console.error('[my/list] pending_products', pendSel.error)

    const items = [...(pendSel.data ?? []), ...(pubSel.data ?? [])]
    return NextResponse.json({ ok: true, items })
  } catch (err) {
    console.error('[my/list]', err)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
