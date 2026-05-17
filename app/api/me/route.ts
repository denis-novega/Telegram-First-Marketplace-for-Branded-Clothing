// app/api/me/route.ts
import { NextResponse } from 'next/server'
import { admin } from '@/lib/supabase-admin'
import { getProfileIdFromCookies } from '@/lib/tg'

export async function GET(req: Request) {
  const pid = getProfileIdFromCookies(req)
  if (!pid) return NextResponse.json({ ok: false, auth: false })

  const { data, error } = await admin
    .from('profiles')
    .select('id, username, name, telegram_username, telegram_photo_url')
    .eq('id', pid)
    .maybeSingle()

  if (error || !data) return NextResponse.json({ ok: false, auth: false })
  return NextResponse.json({ ok: true, auth: true, me: data })
}
