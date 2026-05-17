// app/api/notify-pending/route.tsx
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ====== ENV ======
const ADMIN_NOTIFY_URL = process.env.ADMIN_NOTIFY_URL || ''

// ====== LIMITS ======
const MAX_BODY_SIZE = 5_000 // байт
const ALLOWED_KEYS = new Set(['pending_id', 'profile_id'])

// ====== HELPERS ======
function bad(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status })
}

function isSafeAdminUrl(url: string) {
  try {
    const u = new URL(url)
    return (
      u.protocol === 'https:' &&
      !u.hostname.includes('localhost') &&
      !u.hostname.startsWith('127.') &&
      !u.hostname.startsWith('0.') &&
      !u.hostname.endsWith('.internal')
    )
  } catch {
    return false
  }
}

function sanitizeBody(input: any) {
  if (!input || typeof input !== 'object') return null

  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(input)) {
    if (!ALLOWED_KEYS.has(k)) continue
    if (typeof v !== 'string' && typeof v !== 'number') continue
    out[k] = String(v).slice(0, 128)
  }

  return Object.keys(out).length ? out : null
}

// ====== HANDLER ======
export async function POST(req: NextRequest) {
  // 0️⃣ ENV CHECK
  if (!ADMIN_NOTIFY_URL || !isSafeAdminUrl(ADMIN_NOTIFY_URL)) {
    return new Response(null, { status: 204 })
  }

  // 1️⃣ SIZE LIMIT (до чтения body)
  const len = Number(req.headers.get('content-length') || 0)
  if (!len || len > MAX_BODY_SIZE) {
    return new Response(null, { status: 204 })
  }

  // 2️⃣ PARSE JSON
  let raw: any
  try {
    raw = await req.json()
  } catch {
    return new Response(null, { status: 204 })
  }

  // 3️⃣ SANITIZE PAYLOAD
  const payload = sanitizeBody(raw)
  if (!payload) {
    return new Response(null, { status: 204 })
  }

  // 4️⃣ FORWARD (STRICT, TIMEOUT, NO RESPONSE RELAY)
  try {
    await fetch(`${ADMIN_NOTIFY_URL}/api/notify-pending`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(2000),
    })
  } catch {
    // non-blocking
  }

  // 5️⃣ ALWAYS OK (NO INFO LEAK)
  return new Response(null, { status: 204 })
}
