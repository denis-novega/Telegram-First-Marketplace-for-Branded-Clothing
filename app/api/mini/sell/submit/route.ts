// app/api/mini/sell/submit/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { admin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const jar = await cookies()
    const tgPid = jar.get('tg_pid')?.value
    if (!tgPid) {
      return NextResponse.json({ ok: false, error: 'UNAUTH' }, { status: 401 })
    }

    // Берём необходимые поля профиля
    const { data: prof, error: pe } = await admin
      .from('profiles')
      .select('id, user_id, telegram_id')
      .eq('id', tgPid)
      .maybeSingle()

    if (pe || !prof) {
      return NextResponse.json({ ok: false, error: 'PROFILE_NOT_FOUND' }, { status: 400 })
    }

    // Собираем строку для вставки (включая description)
    const row = {
      title: String(body.title ?? '').trim(),
      price: Number(body.price),
      brand: body.brand ?? null,
      category: body.category ?? null,
      gender: body.gender ?? null,
      size: body.size ?? null,
      condition: body.condition ?? null,
      images: Array.isArray(body.images) ? body.images : [],
      description:
        typeof body.description === 'string'
          ? (body.description as string).trim() || null
          : (body.description ?? null),
      profile_id: prof.id,
      user_id: prof.user_id ?? null,
      seller_tg: prof.telegram_id ?? null,
    }

    const { error: ie } = await admin.from('pending_products').insert(row)
    if (ie) {
      return NextResponse.json({ ok: false, error: ie.message, details: ie }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'SERVER_ERROR' }, { status: 500 })
  }
}
