// app/api/sell/create/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { admin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ====== LIMITS ======
const MAX_IMAGES = 10
const MAX_TITLE_LEN = 120
const MAX_DESC_LEN = 2000
const MAX_PRICE = 10_000_000

// ====== HELPERS ======
function bad(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status })
}

function isValidUrl(u: string) {
  try {
    const url = new URL(u)
    return url.protocol === 'https:' && url.hostname.endsWith('supabase.co')
  } catch {
    return false
  }
}

function normalize(body: any) {
  if (!body || typeof body !== 'object') return null

  const {
    title,
    price,
    images,
    brand,
    category,
    gender,
    condition,
    size,
    description,
  } = body

  if (typeof title !== 'string' || !title.trim()) return null
  if (title.length > MAX_TITLE_LEN) return null

  const numPrice = Number(price)
  if (!Number.isFinite(numPrice) || numPrice <= 0 || numPrice > MAX_PRICE) {
    return null
  }

  if (!Array.isArray(images) || images.length === 0 || images.length > MAX_IMAGES) {
    return null
  }

  const safeImages = images.filter(
    (u) => typeof u === 'string' && isValidUrl(u)
  )
  if (safeImages.length !== images.length) return null

  if (description && typeof description === 'string' && description.length > MAX_DESC_LEN) {
    return null
  }

  return {
    title: title.trim(),
    price: numPrice,
    images: safeImages,
    brand: brand ? String(brand).slice(0, 64) : null,
    category: category ? String(category).slice(0, 32) : null,
    gender: gender ? String(gender).slice(0, 8) : null,
    condition: condition ? String(condition).slice(0, 16) : null,
    size: size ? String(size).slice(0, 16) : null,
    description: description ? String(description) : null,
  }
}

// ====== HANDLER ======
export async function POST(req: Request) {
  try {
    // 1️⃣ AUTH — строго через tg_pid
    const cookieStore = await cookies()
    const pid = cookieStore.get('tg_pid')?.value

    if (!pid || !/^[a-zA-Z0-9_-]{8,}$/.test(pid)) {
      return bad(401, 'NOT_LOGGED_IN')
    }

    // 2️⃣ CONTENT-TYPE CHECK
    const ct = req.headers.get('content-type') || ''
    if (!ct.includes('application/json')) {
      return bad(415, 'UNSUPPORTED_CONTENT_TYPE')
    }

    // 3️⃣ PARSE + NORMALIZE
    let raw: any
    try {
      raw = await req.json()
    } catch {
      return bad(400, 'BAD_JSON')
    }

    const payload = normalize(raw)
    if (!payload) {
      return bad(400, 'BAD_INPUT')
    }

    // 4️⃣ INSERT (MINIMAL RESPONSE)
    const { data, error } = await admin
      .from('pending_products')
      .insert({
        ...payload,
        profile_id: pid,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error || !data?.id) {
      console.error('[sell/create] insert error', error)
      return bad(500, 'DB_INSERT')
    }

    // 5️⃣ OPTIONAL ADMIN NOTIFY (SAFE)
    const ADMIN_NOTIFY_URL = process.env.ADMIN_NOTIFY_URL
    if (ADMIN_NOTIFY_URL && ADMIN_NOTIFY_URL.startsWith('https://')) {
      try {
        await fetch(`${ADMIN_NOTIFY_URL}/api/notify-pending`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            pending_id: data.id,
            profile_id: pid,
          }),
          signal: AbortSignal.timeout(2000),
        })
      } catch (e) {
        // non-blocking
        console.warn('[sell/create] notify skipped')
      }
    }

    return NextResponse.json({ ok: true, id: data.id })
  } catch (e) {
    console.error('[sell/create] fatal', e)
    return bad(500, 'SERVER')
  }
}
