// app/api/my/delete/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { admin } from '@/lib/supabase-admin'

export const revalidate = 0
export const dynamic = 'force-dynamic'
export const fetchCache = 'default-no-store'

export async function POST(req: Request) {
  try {
    // tg_pid можно использовать, но он нам теперь не важен
    await cookies() // для Next.js 15 нужно вызывать, иначе ворчит
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ ok: false, error: 'NO_ID' }, { status: 400 })
    }

    // Пробуем удалить из products и pending_products без проверок
    const del1 = await admin.from('products').delete().eq('id', id)
    if (del1.error) {
      console.error('[my/delete] products error', del1.error)
    }

    const del2 = await admin.from('pending_products').delete().eq('id', id)
    if (del2.error) {
      console.error('[my/delete] pending_products error', del2.error)
    }

    // Неважно, нашли или нет — просто отвечаем ok
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[my/delete] exception', e)
    return NextResponse.json({ ok: false, error: 'SERVER_ERROR' }, { status: 500 })
  }
}
