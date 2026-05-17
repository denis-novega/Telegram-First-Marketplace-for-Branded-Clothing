// app/api/profile/update/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { admin } from '@/lib/supabase-admin'

function sanitizeTg(v: unknown) {
  const s = String(v ?? '').trim()
  return s.replace(/^@+/, '').replace(/\s+/g, '') || null
}

export const revalidate = 0
export const dynamic = 'force-dynamic'
export const fetchCache = 'default-no-store'

export async function POST(req: Request) {
  try {
    // ✅ в Next 15 cookies() — асинхронный
    const store = await cookies()
    const pid = store.get('tg_pid')?.value
    if (!pid) {
      return NextResponse.json({ ok: false, error: 'NO_AUTH' }, { status: 401 })
    }

    const body = await req.json()

    // ⚠️ никаких display_name — используем name
    const payload = {
      username: (body.username ?? '').trim() || null,
      name: (body.name ?? '').trim() || null,
      city: (body.city ?? '').trim() || null,
      telegram_username: sanitizeTg(body.telegram_username),
      bio: (body.bio ?? '').trim() || null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await admin
      .from('profiles')
      .update(payload)
      .eq('id', pid)

    if (error) {
      console.error('[profile/update]', error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[profile/update] exception', e)
    return NextResponse.json({ ok: false, error: 'SERVER_ERROR' }, { status: 500 })
  }
}
