// app/api/me/edit/route.ts
import { NextResponse } from 'next/server'
import { admin } from '@/lib/supabase-admin'
import { getProfileIdFromCookies } from '@/lib/tg'

// Совместимо с вашим кэшингом
export const revalidate = 0
export const dynamic = 'force-dynamic'
export const fetchCache = 'default-no-store'

export async function GET(req: Request) {
  const pid = getProfileIdFromCookies(req)
  if (!pid) return NextResponse.json({ ok: false, auth: false })

  const { data, error } = await admin
    .from('profiles')
    // ВАЖНО: тут отдаем все поля, которые ваша форма ждёт
    .select('id, username, name, city, bio, telegram_username, telegram_photo_url')
    .eq('id', pid)
    .maybeSingle()

  if (error || !data) return NextResponse.json({ ok: false, auth: false })

  // ключ именно profile — под то, что ждут мини-экраны
  return NextResponse.json({ ok: true, auth: true, profile: data })
}
