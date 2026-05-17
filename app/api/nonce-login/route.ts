// app/api/nonce-login/route.ts
// SAFE VERSION — atomic nonce consume + hardened cookie + strict input

import { NextResponse } from 'next/server'
import { admin } from '@/lib/supabase-admin'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COOKIE = '__Host-tg_pid'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

type J = Record<string, unknown>

function jlog(level: 'info' | 'warn' | 'error', msg: string, extra?: J) {
  // не логируем nonce / secrets / токены
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...(extra || {}) }))
}

function mkReqId() {
  return crypto.randomBytes(12).toString('hex')
}

function normHeader(v: string | null, maxLen: number) {
  if (!v) return 'unknown'
  const s = String(v).trim()
  if (!s) return 'unknown'
  return s.length > maxLen ? s.slice(0, maxLen) : s
}

function isGoodNonce(n: string) {
  // nonce должен быть достаточно длинным и безопасным по алфавиту
  // подгони regex под твой генератор, но не делай слишком широким
  return /^[A-Za-z0-9_\-]{16,128}$/.test(n)
}

export async function POST(req: Request) {
  const reqId = mkReqId()
  const ip = normHeader(req.headers.get('x-forwarded-for'), 128)
  const ua = normHeader(req.headers.get('user-agent'), 256)

  try {
    if (!(req.headers.get('content-type') || '').includes('application/json')) {
      return NextResponse.json({ ok: false, error: 'BAD_CONTENT_TYPE', reqId }, { status: 415 })
    }

    const body = (await req.json().catch(() => null)) as any
    const nonce = String(body?.nonce || '').trim()

    if (!nonce) {
      return NextResponse.json({ ok: false, error: 'NO_NONCE', reqId }, { status: 400 })
    }
    if (!isGoodNonce(nonce)) {
      // не палим nonce в логах/ответах
      jlog('warn', 'nonce:bad_format', { reqId })
      return NextResponse.json({ ok: false, error: 'BAD_NONCE', reqId }, { status: 400 })
    }

    // ======= ВАЖНО: атомарное "consume nonce" =======
    // Вместо "select -> потом update", делаем update с условиями:
    // used_at IS NULL и expires_at > now()
    // и берём telegram_id из returning.
    const nowIso = new Date().toISOString()

    const { data: consumed, error: consumeErr } = await admin
      .from('login_nonces')
      .update({ used_at: nowIso, ip, ua })
      .eq('nonce', nonce)
      .is('used_at', null)
      .gt('expires_at', nowIso)
      .select('telegram_id')
      .maybeSingle()

    if (consumeErr) {
      jlog('error', 'nonce:consume_fail', { reqId, code: (consumeErr as any)?.code || 'unknown' })
      return NextResponse.json({ ok: false, error: 'DB_ERROR', reqId }, { status: 500 })
    }

    if (!consumed?.telegram_id) {
      // nonce либо не существует, либо уже использован, либо просрочен
      // для безопасности не различаем причины
      jlog('warn', 'nonce:invalid_or_used_or_expired', { reqId })
      return NextResponse.json({ ok: false, error: 'NONCE_INVALID', reqId }, { status: 401 })
    }

    const telegram_id = String(consumed.telegram_id).trim()
    if (!telegram_id) {
      jlog('error', 'nonce:missing_telegram_id', { reqId })
      return NextResponse.json({ ok: false, error: 'NONCE_INVALID', reqId }, { status: 401 })
    }

    // ======= upsert профиль (без гонки на insert) =======
    // 1) пробуем найти
    const { data: byTid, error: selErr } = await admin
      .from('profiles')
      .select('id, username, name')
      .eq('telegram_id', telegram_id)
      .maybeSingle()

    if (selErr) {
      jlog('error', 'profile:select_fail', { reqId, code: (selErr as any)?.code || 'unknown' })
      return NextResponse.json({ ok: false, error: 'DB_PROFILE_SELECT', reqId }, { status: 500 })
    }

    let profile_id = byTid?.id as string | undefined

    if (!profile_id) {
      const username = `tg_${telegram_id}`
      const name = username

      // 2) insert. если параллельно кто-то вставил — ловим конфликт и перечитываем
      const ins = await admin
        .from('profiles')
        .insert({ telegram_id, username, name })
        .select('id')
        .single()

      if (ins.error) {
        // Если в базе есть UNIQUE на profiles.telegram_id — тут может быть conflict.
        // В таком случае просто перечитываем.
        jlog('warn', 'profile:insert_fail_try_refetch', { reqId, code: ins.error.code })

        const { data: again, error: againErr } = await admin
          .from('profiles')
          .select('id')
          .eq('telegram_id', telegram_id)
          .maybeSingle()

        if (againErr || !again?.id) {
          jlog('error', 'profile:refetch_fail', { reqId })
          return NextResponse.json({ ok: false, error: 'DB_PROFILE_INSERT', reqId }, { status: 500 })
        }

        profile_id = again.id
      } else {
        profile_id = ins.data.id
      }
    }

    if (!profile_id) {
      jlog('error', 'profile:id_missing', { reqId })
      return NextResponse.json({ ok: false, error: 'PROFILE_ID_MISSING', reqId }, { status: 500 })
    }

    // ======= cookie hardening =======
    const res = NextResponse.json({ ok: true, profile_id, reqId })

    res.headers.append(
      'Set-Cookie',
      `${COOKIE}=${encodeURIComponent(profile_id)}; ` +
        `Path=/; Max-Age=${COOKIE_MAX_AGE}; ` +
        'HttpOnly; Secure; SameSite=Lax'
    )

    return res
  } catch (e: any) {
    jlog('error', 'nonce-login:exception', { reqId })
    return NextResponse.json({ ok: false, error: 'SERVER_ERROR', reqId }, { status: 500 })
  }
}

export function GET() {
  return new NextResponse(null, { status: 405 })
}
